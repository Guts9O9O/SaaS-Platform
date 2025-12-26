const Order = require("../../models/Order");
const Table = require("../../models/Table");

exports.getLiveOrdersByTable = async (req, res) => {
  try {
    const { restaurantId } = req.admin;

    // 1) Get active tables (optional filter) OR just fetch all tables for restaurant
    const tables = await Table.find({ restaurantId }).select("_id tableCode").lean();

    const tableMap = new Map(
      tables.map((t) => [String(t._id), { tableId: t._id, tableCode: t.tableCode }])
    );

    // 2) Fetch live orders (not billed, not cancelled/rejected)
    const orders = await Order.find({
      restaurantId,
      billed: false,
      status: { $nin: ["CANCELLED", "REJECTED"] },
    })
      .sort({ createdAt: -1 }) // newest first overall
      .lean();

    // 3) Group by tableId
    const grouped = new Map();

    for (const o of orders) {
      const tId = String(o.tableId);

      if (!grouped.has(tId)) {
        const tInfo = tableMap.get(tId) || { tableId: o.tableId, tableCode: "UNKNOWN" };
        grouped.set(tId, {
          ...tInfo,
          lastOrderAt: o.createdAt,
          openOrders: [],
          totalOpenAmount: 0,
        });
      }

      const g = grouped.get(tId);
      g.openOrders.push(o);
      g.totalOpenAmount += Number(o.totalAmount || 0);

      // lastOrderAt should be max createdAt (orders are sorted desc, first is latest)
      if (!g.lastOrderAt || new Date(o.createdAt) > new Date(g.lastOrderAt)) {
        g.lastOrderAt = o.createdAt;
      }
    }

    // 4) Convert to array + sort tables by latest activity
    const result = Array.from(grouped.values()).sort(
      (a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt)
    );

    res.json({ count: result.length, tables: result });
  } catch (err) {
    console.error("Live orders by table error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
