const Order = require("../../models/Order");
const MenuItem = require("../../models/MenuItem");
const Table = require("../../models/Table");

function getSessionIdFromReq(req) {
  // ✅ new cookie name + backward compatibility
  return req.cookies?.customerSessionId || req.cookies?.sessionId || null;
}

exports.placeOrder = async (req, res) => {
  try {
    const sessionId = getSessionIdFromReq(req);

    // payload still allowed (to avoid frontend changes)
    const { restaurantId, tableId, items, notes } = req.body;

    if (!sessionId || !restaurantId || !tableId || !items?.length) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    // ✅ verify table belongs to restaurant and active
    const table = await Table.findOne({
      _id: tableId,
      restaurantId,
      isActive: true,
    });

    if (!table) {
      return res.status(404).json({ message: "Invalid table" });
    }

    let totalAmount = 0;
    const finalItems = [];

    // ✅ avoid N sequential DB calls? (keep simple but safe)
    for (const item of items) {
      if (!item?.itemId) continue;

      const dbItem = await MenuItem.findById(item.itemId);
      if (!dbItem || dbItem.isAvailable === false) continue;

      const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      const itemTotal = dbItem.price * qty;

      totalAmount += itemTotal;

      finalItems.push({
        itemId: dbItem._id,
        name: dbItem.name,
        price: dbItem.price,
        quantity: qty,
      });
    }

    if (!finalItems.length) {
      return res.status(400).json({ message: "No valid items" });
    }

    const order = await Order.create({
      restaurantId,
      tableId,
      sessionId, // ✅ store session id for "my orders"
      items: finalItems,
      totalAmount,
      notes,
      // later: customerId (from session link)
      // customerId: req.customerSession?.customerId || null,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit("order_updated", {
        type: "NEW_ORDER",
        order,
      });

      io.to(`session_${sessionId}`).emit("customer_orders_updated", {
        type: "NEW_ORDER",
        orderId: order._id.toString(),
      });
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

    if (!sessionId) {
      return res.status(401).json({ message: "No session" });
    }

    const orders = await Order.find({ sessionId }).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (err) {
    console.error("Get my orders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
