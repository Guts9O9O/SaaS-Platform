const mongoose = require("mongoose");
const Order = require("../../models/Order");
const CustomerSession = require("../../models/CustomerSession");
const Customer = require("../../models/Customer");

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

exports.getCustomerAnalytics = async (req, res) => {
  try {
    const restaurantId = req.restaurantId; // from authAdmin
    if (!restaurantId) return res.status(403).json({ message: "Restaurant context missing" });

    // optional filters
    const { days = "7" } = req.query;
    const daysNum = Math.max(1, Math.min(365, Number(days) || 7));
    const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const rid = toObjectId(restaurantId);

    // ✅ Build a per-customer summary by joining:
    // Order.sessionId -> CustomerSession.sessionId -> CustomerSession.customerId -> Customer
    const perCustomer = await Order.aggregate([
      {
        $match: {
          restaurantId: rid,
          createdAt: { $gte: since },
          // only count real orders (avoid cancelled/rejected if you want)
          status: { $nin: ["CANCELLED", "REJECTED"] },
        },
      },
      {
        $lookup: {
          from: "customersessions",
          localField: "sessionId",
          foreignField: "sessionId",
          as: "cs",
        },
      },
      { $unwind: { path: "$cs", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "customers",
          localField: "cs.customerId",
          foreignField: "_id",
          as: "cust",
        },
      },
      { $unwind: { path: "$cust", preserveNullAndEmptyArrays: true } },

      // We define a "customerKey":
      // - if customerId exists → use it
      // - else fallback to phone in CustomerSession (guest)
      // - else fallback to sessionId (anonymous)
      {
        $addFields: {
          customerKey: {
            $ifNull: [
              { $toString: "$cs.customerId" },
              { $ifNull: ["$cs.phone", "$sessionId"] },
            ],
          },
        },
      },

      // group by customerKey
      {
        $group: {
          _id: "$customerKey",
          customerId: { $first: "$cs.customerId" },
          name: { $first: "$cust.name" },
          phone: { $first: { $ifNull: ["$cust.phone", "$cs.phone"] } },
          totalSpent: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
          lastOrderAt: { $max: "$createdAt" },

          // collect items for preference analysis
          items: { $push: "$items" },
        },
      },

      // flatten items array-of-arrays
      {
        $addFields: {
          flatItems: {
            $reduce: {
              input: "$items",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] },
            },
          },
        },
      },

      // calculate favorite item
      { $unwind: { path: "$flatItems", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          customerId: { $first: "$customerId" },
          name: { $first: "$name" },
          phone: { $first: "$phone" },
          totalSpent: { $first: "$totalSpent" },
          totalOrders: { $first: "$totalOrders" },
          lastOrderAt: { $first: "$lastOrderAt" },

          itemCounts: {
            $push: {
              name: "$flatItems.name",
              qty: { $ifNull: ["$flatItems.quantity", 0] },
            },
          },
        },
      },

      // compute favorite item in JS-friendly way: return itemCounts, we’ll summarize later
      { $sort: { totalSpent: -1 } },
    ]);

    // overview numbers
    const totalCustomers = perCustomer.length;
    const repeatCustomers = perCustomer.filter((c) => (c.totalOrders || 0) > 1).length;

    const totalSpentAll = perCustomer.reduce((s, c) => s + Number(c.totalSpent || 0), 0);
    const totalOrdersAll = perCustomer.reduce((s, c) => s + Number(c.totalOrders || 0), 0);

    const overview = {
      days: daysNum,
      totalCustomers,
      repeatCustomers,
      repeatRate: totalCustomers ? Number(((repeatCustomers / totalCustomers) * 100).toFixed(2)) : 0,
      avgSpendPerCustomer: totalCustomers ? Number((totalSpentAll / totalCustomers).toFixed(2)) : 0,
      avgOrdersPerCustomer: totalCustomers ? Number((totalOrdersAll / totalCustomers).toFixed(2)) : 0,
    };

    // top customers
    const topCustomers = perCustomer.slice(0, 10).map((c) => ({
      customerId: c.customerId || null,
      key: c._id,
      name: c.name || "Guest",
      phone: c.phone || "-",
      totalSpent: Number(c.totalSpent || 0),
      totalOrders: Number(c.totalOrders || 0),
      lastOrderAt: c.lastOrderAt || null,
      favoriteItem: (() => {
        const counts = new Map();
        for (const x of c.itemCounts || []) {
          if (!x?.name) continue;
          counts.set(x.name, (counts.get(x.name) || 0) + Number(x.qty || 0));
        }
        let best = null;
        for (const [name, qty] of counts.entries()) {
          if (!best || qty > best.qty) best = { name, qty };
        }
        return best?.name || null;
      })(),
    }));

    // top items overall (by quantity + unique customers)
    const itemMap = new Map(); // name -> { totalQuantity, customersSet }
    for (const c of perCustomer) {
      const customerKey = c._id;
      const localItemCounts = new Map();

      for (const x of c.itemCounts || []) {
        if (!x?.name) continue;
        localItemCounts.set(x.name, (localItemCounts.get(x.name) || 0) + Number(x.qty || 0));
      }

      for (const [name, qty] of localItemCounts.entries()) {
        if (!itemMap.has(name)) itemMap.set(name, { name, totalQuantity: 0, customers: new Set() });
        const obj = itemMap.get(name);
        obj.totalQuantity += qty;
        obj.customers.add(customerKey);
      }
    }

    const topItems = Array.from(itemMap.values())
      .map((x) => ({
        name: x.name,
        totalQuantity: x.totalQuantity,
        uniqueCustomers: x.customers.size,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    return res.json({
      overview,
      topCustomers,
      topItems,
    });
  } catch (e) {
    console.error("getCustomerAnalytics error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};
