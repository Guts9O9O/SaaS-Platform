const Order = require("../../models/Order");
const MenuItem = require("../../models/MenuItem");
const Table = require("../../models/Table");

function getSessionIdFromReq(req) {
  return req.cookies?.customerSessionId || req.cookies?.sessionId || null;
}

exports.placeOrder = async (req, res) => {
  try {
    const sessionId = getSessionIdFromReq(req);
    const { restaurantId, tableId, items, notes } = req.body;
    if (!sessionId || !restaurantId || !tableId || !items?.length) {
      return res.status(400).json({ message: "Invalid order data" });
    }
    const table = await Table.findOne({ _id: tableId, restaurantId, isActive: true });
    if (!table) return res.status(404).json({ message: "Invalid table" });

    let totalAmount = 0;
    const finalItems = [];
    for (const item of items) {
      if (!item?.itemId) continue;
      const dbItem = await MenuItem.findById(item.itemId);
      if (!dbItem || dbItem.isActive === false) continue;
      const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      totalAmount += dbItem.price * qty;
      finalItems.push({ itemId: dbItem._id, name: dbItem.name, price: dbItem.price, quantity: qty });
    }
    if (!finalItems.length) return res.status(400).json({ message: "No valid items" });

    const order = await Order.create({
      restaurantId, tableId, sessionId, items: finalItems, totalAmount, notes,
    });

    const io = req.app.get("io");
    if (io) {
      // Notify admin/restaurant dashboard
      io.to(`restaurant_${restaurantId}`).emit("order_updated", { type: "NEW_ORDER", order });
      // Notify customer session
      io.to(`session_${sessionId}`).emit("customer_orders_updated", {
        type: "NEW_ORDER", orderId: order._id.toString(),
      });
      // ✅ NEW: Notify assigned waiter directly
      const waiterUserId = table.assignedWaiterId?.toString() || null;
      if (waiterUserId) {
        io.to(`waiter_${waiterUserId}`).emit("waiter:new_order", {
          orderId: order._id.toString(),
          tableId: tableId.toString(),
          tableCode: table.tableCode,
          items: finalItems,
          totalAmount,
          createdAt: order.createdAt,
        });
        console.log(`[SOCKET EMIT] waiter:new_order → waiter_${waiterUserId} (Table ${table.tableCode})`);
      }
    }
    return res.status(201).json(order);
  } catch (err) {
    console.error("Place order error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const sessionId = getSessionIdFromReq(req);
    if (!sessionId) return res.status(401).json({ message: "No session" });
    const orders = await Order.find({ sessionId }).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (err) {
    console.error("Get my orders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};