const Table = require("../../models/Table");
const Order = require("../../models/Order");

exports.myTables = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const waiterId = req.user._id;
    const tables = await Table.find({
      restaurantId,
      assignedWaiterId: waiterId,
      isActive: true,
    })
      .select("_id tableCode isActive assignedWaiterId")
      .sort({ tableCode: 1 });
    return res.json({ tables });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/waiter/tables/orders
 * Returns all unbilled orders for all tables assigned to this waiter.
 * Grouped by tableCode for easy rendering.
 * Once a bill is closed (billed: true), those orders disappear automatically
 * because this query only fetches billed: false.
 */
exports.getTableOrders = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const waiterId = req.user._id;

    // Get all tables assigned to this waiter
    const tables = await Table.find({
      restaurantId,
      assignedWaiterId: waiterId,
      isActive: true,
    }).select("_id tableCode").lean();

    if (!tables.length) return res.json({ tableOrders: [] });

    const tableIds = tables.map(t => t._id);
    const tableMap = new Map(tables.map(t => [t._id.toString(), t.tableCode]));

    // Fetch all unbilled, non-cancelled orders for those tables
    const orders = await Order.find({
      restaurantId,
      tableId: { $in: tableIds },
      billed: false,
      status: { $nin: ["CANCELLED", "REJECTED"] },
    }).sort({ createdAt: 1 }).lean();

    // Group orders by tableId
    const grouped = {};
    for (const table of tables) {
      grouped[table._id.toString()] = {
        tableId: table._id.toString(),
        tableCode: table.tableCode,
        orders: [],
        totalAmount: 0,
      };
    }
    for (const order of orders) {
      const key = order.tableId.toString();
      if (grouped[key]) {
        grouped[key].orders.push(order);
        grouped[key].totalAmount += order.totalAmount || 0;
      }
    }

    // Only return tables that have at least one order
    const tableOrders = Object.values(grouped).filter(g => g.orders.length > 0);

    return res.json({ tableOrders });
  } catch (e) {
    console.error("getTableOrders error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};