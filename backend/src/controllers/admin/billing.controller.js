const Order = require("../../models/Order");
const Table = require("../../models/Table");
const Bill = require("../../models/Bill");

exports.getOpenBillForTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const { restaurantId } = req.admin;
    const table = await Table.findOne({ _id: tableId, restaurantId });
    if (!table) return res.status(404).json({ message: "Table not found" });
    const orders = await Order.find({ tableId, restaurantId, billed: false, status: { $in: ["ACCEPTED", "IN_KITCHEN", "READY", "SERVED"] } }).sort({ createdAt: 1 });
    const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    res.json({ tableId, tableCode: table.tableCode, orders, totalAmount });
  } catch (err) {
    console.error("Get open bill error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.closeBillForTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const { restaurantId } = req.admin;

    const orders = await Order.find({ tableId, restaurantId, billed: false, status: { $in: ["ACCEPTED", "IN_KITCHEN", "READY", "SERVED"] } });
    if (!orders.length) return res.status(400).json({ message: "No open orders" });

    const orderIds = orders.map((o) => o._id);
    const sessionIds = [...new Set(orders.map((o) => o.sessionId).filter(Boolean))];

    const map = new Map();
    let subtotal = 0;
    for (const o of orders) {
      for (const it of o.items || []) {
        const key = `${it.itemId.toString()}::${Number(it.price)}`;
        const prev = map.get(key);
        if (!prev) {
          map.set(key, { itemId: it.itemId, name: it.name, price: Number(it.price), quantity: Number(it.quantity || 0) });
        } else {
          prev.quantity += Number(it.quantity || 0);
        }
      }
    }
    const items = Array.from(map.values()).map((x) => {
      const lineTotal = Number(x.price) * Number(x.quantity);
      subtotal += lineTotal;
      return { ...x, lineTotal };
    });

    const taxAmount = 0;
    const grandTotal = subtotal + taxAmount;

    const bill = await Bill.create({
      restaurantId, tableId, orderIds, items,
      subtotal, taxAmount, grandTotal,
      closedBy: req.admin?._id,
      closedAt: new Date(),
      status: "CLOSED",
    });

    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { billed: true, billId: bill._id, status: "COMPLETED" } }
    );

    // Look up the table to get tableCode and assignedWaiterId
    const table = await Table.findById(tableId).select("tableCode assignedWaiterId").lean();
    const waiterUserId = table?.assignedWaiterId?.toString() || null;
    const tableCode = table?.tableCode || req.body?.tableCode || null;

    const io = req.app.get("io");
    if (io) {
      // ✅ Notify admin dashboard
      io.to(`restaurant_${restaurantId}`).emit("billing_closed", {
        tableId, orderIds, billId: bill._id, grandTotal,
      });

      // ✅ Notify each customer session — triggers feedback screen
      for (const sessionId of sessionIds) {
        io.to(`session_${sessionId}`).emit("bill_closed", {
          billId: bill._id,
          grandTotal,
          tableCode,
          restaurantName: req.body?.restaurantName || null,
        });
        console.log(`[SOCKET] bill_closed → session_${sessionId}`);
      }

      // ✅ NEW: Notify assigned waiter — clears their orders for this table
      if (waiterUserId) {
        io.to(`waiter_${waiterUserId}`).emit("waiter:bill_closed", {
          tableId: tableId.toString(),
          tableCode,
          billId: bill._id.toString(),
          grandTotal,
        });
        console.log(`[SOCKET] waiter:bill_closed → waiter_${waiterUserId} (Table ${tableCode})`);
      }
    }

    res.json({ success: true, billId: bill._id, closedOrders: orderIds.length, subtotal, taxAmount, grandTotal });
  } catch (err) {
    console.error("Close bill error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getBillById = async (req, res) => {
  try {
    const { billId } = req.params;
    const { restaurantId } = req.admin;
    const bill = await require("../../models/Bill").findOne({ _id: billId, restaurantId }).lean();
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    res.json(bill);
  } catch (err) {
    console.error("Get bill error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getBillHistoryForTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const { restaurantId } = req.admin;
    const bills = await require("../../models/Bill").find({ tableId, restaurantId }).sort({ closedAt: -1 }).lean();
    res.json({ tableId, count: bills.length, bills });
  } catch (err) {
    console.error("Bill history error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getRecentBills = async (req, res) => {
  try {
    const { restaurantId } = req.admin;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const bills = await Bill.find({ restaurantId }).sort({ closedAt: -1 }).limit(limit).lean();
    const tableIds = [...new Set(bills.map(b => String(b.tableId)).filter(Boolean))];
    const tables = await Table.find({ _id: { $in: tableIds }, restaurantId }).select("_id tableCode").lean();
    const tableMap = new Map(tables.map(t => [String(t._id), t.tableCode]));
    const enriched = bills.map(b => ({ ...b, tableCode: tableMap.get(String(b.tableId)) || null }));
    return res.json({ success: true, count: enriched.length, bills: enriched });
  } catch (err) {
    console.error("Get recent bills error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getBillTableSummary = async (req, res) => {
  try {
    const { restaurantId } = req.admin;
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || "50", 10)));
    const mongoose = require("mongoose");
    const rows = await Bill.aggregate([
      { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId) } },
      { $group: { _id: "$tableId", billsCount: { $sum: 1 }, totalRevenue: { $sum: "$grandTotal" }, lastClosedAt: { $max: "$closedAt" } } },
      { $sort: { lastClosedAt: -1 } },
      { $limit: limit },
    ]);
    const tableIds = rows.map(r => r._id).filter(Boolean);
    const tables = await Table.find({ _id: { $in: tableIds }, restaurantId }).select("_id tableCode").lean();
    const tableMap = new Map(tables.map(t => [String(t._id), t.tableCode]));
    const summary = rows.map(r => ({ tableId: r._id, tableCode: tableMap.get(String(r._id)) || null, billsCount: r.billsCount, totalRevenue: r.totalRevenue || 0, lastClosedAt: r.lastClosedAt }));
    return res.json({ success: true, count: summary.length, tables: summary });
  } catch (err) {
    console.error("Get bill table summary error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};