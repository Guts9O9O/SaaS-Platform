const Order = require("../../models/Order");
const MenuItem = require("../../models/MenuItem");
const Table = require("../../models/Table");

exports.placeOrder = async (req, res) => {
  try {
    const { sessionId } = req.cookies;
    const { restaurantId, tableId, items, notes } = req.body;

    if (!sessionId || !restaurantId || !tableId || !items?.length) {
      return res.status(400).json({ message: "Invalid order data" });
    }

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

    for (const item of items) {
      const dbItem = await MenuItem.findById(item.itemId);
      if (!dbItem || dbItem.isAvailable === false) continue;

      const qty = item.quantity || 1;
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
      sessionId,
      items: finalItems,
      totalAmount,
      notes,
    });

    // 🔔 notify admin
    const io = req.app.get("io");
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit("order_updated", {
        type: "NEW_ORDER",
        order,
      });
    }

    res.status(201).json(order);
  } catch (err) {
    console.error("Place order error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const { sessionId } = req.cookies;
    if (!sessionId) {
      return res.status(401).json({ message: "No session" });
    }

    const orders = await Order.find({ sessionId }).sort({
      createdAt: -1,
    });

    res.json(orders);
  } catch (err) {
    console.error("Get my orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
