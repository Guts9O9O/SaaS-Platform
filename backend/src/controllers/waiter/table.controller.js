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
 */
exports.getTableOrders = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const waiterId = req.user._id;

    const tables = await Table.find({
      restaurantId,
      assignedWaiterId: waiterId,
      isActive: true,
    }).select("_id tableCode").lean();

    if (!tables.length) return res.json({ tableOrders: [] });

    const tableIds = tables.map(t => t._id);
    const tableMap = new Map(tables.map(t => [t._id.toString(), t.tableCode]));

    const orders = await Order.find({
      restaurantId,
      tableId: { $in: tableIds },
      billed: false,
      status: { $nin: ["CANCELLED", "REJECTED"] },
    }).sort({ createdAt: 1 }).lean();

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

    const tableOrders = Object.values(grouped).filter(g => g.orders.length > 0);
    return res.json({ tableOrders });
  } catch (e) {
    console.error("getTableOrders error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PATCH /api/waiter/tables/orders/:orderId/deliver
 * Waiter marks an order as SERVED (delivered to table).
 * Only allowed if order belongs to a table assigned to this waiter.
 * Emits order:updated via socket so admin dashboard updates too.
 */
exports.markDelivered = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const waiterId     = req.user._id;
    const { orderId }  = req.params;

    // Find the order
    const order = await Order.findOne({ _id: orderId, restaurantId }).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Verify the table is assigned to this waiter
    const table = await Table.findOne({
      _id: order.tableId,
      restaurantId,
      assignedWaiterId: waiterId,
      isActive: true,
    }).lean();
    if (!table) return res.status(403).json({ message: "Not your table" });

    // Only allow delivery if order is ACCEPTED or READY (kitchen done)
    if (!["ACCEPTED", "IN_KITCHEN", "READY"].includes(order.status)) {
      return res.status(400).json({ message: `Cannot deliver order with status ${order.status}` });
    }

    // Update to SERVED
    const updated = await Order.findByIdAndUpdate(
      orderId,
      { $set: { status: "SERVED" } },
      { new: true }
    ).lean();

    // Emit to admin dashboard + customer
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit("order:updated", updated);
      io.to(`order_${orderId}`).emit("order:status", updated);
      // Emit back to waiter room so their own UI updates if multiple devices
      io.to(`waiter_${waiterId}`).emit("waiter:order_updated", {
        orderId: updated._id.toString(),
        tableId: updated.tableId.toString(),
        status: "SERVED",
      });
    }

    return res.json({ success: true, orderId, status: "SERVED" });
  } catch (e) {
    console.error("markDelivered error:", e);
    return res.status(500).json({ message: "Server error" });
  }
};