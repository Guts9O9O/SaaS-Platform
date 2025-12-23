const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');

// POST /api/orders/create
router.post('/create', async (req, res) => {
  try {
    const { restaurantSlug, tableCode, customerPhone, orderItems, notes } = req.body;

    if (!restaurantSlug || !customerPhone || !orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const restaurant = await Restaurant.findOne({ slug: restaurantSlug, active: true });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found or inactive' });

    const table = await Table.findOne({ restaurantId: restaurant._id, tableCode });
    const customer = await Customer.findOne({ phone: customerPhone });

    // compute total
    let total = 0;
    const itemsForOrder = orderItems.map(it => {
      const price = parseFloat(it.price || 0);
      const qty = parseInt(it.quantity || 1, 10);
      total += price * qty;
      return {
        ...(it.menuItemId ? { menuItemId: it.menuItemId } : {}),
        name: it.name,
        priceAtTime: price,
        quantity: qty,
        variants: it.variants || {},
        addons: it.addons || [],
        notes: it.notes || ''
      };
    });

    const order = await Order.create({
      restaurantId: restaurant._id,
      tableId: table ? table._id : null,
      customerId: customer ? customer._id : null,
      orderItems: itemsForOrder,
      totalAmount: total,
      notes: notes || '',
      status: 'ACCEPTED'
    });

    // emit socket event to restaurant admins
    try {
      const io = req.app.get('io');
      if (io) {
        const room = `restaurant_${restaurant._id.toString()}`;
        io.to(room).emit('new_order', { orderId: order._id.toString(), order });
        console.log('Emitted new_order to', room);
      }
    } catch (e) {
      console.error('Socket emit error (new_order):', e);
    }

    console.log('New order created:', order._id.toString());
    return res.json({ success: true, orderId: order._id, status: order.status });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/table
router.get('/table', async (req, res) => {
  try {
    const { restaurantSlug, tableCode, phone } = req.query;

    if (!restaurantSlug || !tableCode) {
      return res.status(400).json({ message: 'Missing parameters' });
    }

    const restaurant = await Restaurant.findOne({ slug: restaurantSlug });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const table = await Table.findOne({
      restaurantId: restaurant._id,
      tableCode
    });

    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const orders = await Order.find({
      restaurantId: restaurant._id,
      tableId: table._id
    }).sort({ createdAt: -1 });

    return res.json(orders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/restaurant
router.get('/restaurant', async (req, res) => {
  try {
    const { restaurantSlug } = req.query;

    if (!restaurantSlug) {
      return res.status(400).json({ message: 'restaurantSlug is required' });
    }

    const restaurant = await Restaurant.findOne({ slug: restaurantSlug });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const orders = await Order.find({
      restaurantId: restaurant._id
    })
      .populate('tableId')
      .sort({ createdAt: -1 });

    return res.json(orders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['ACCEPTED', 'PREPARING', 'SERVED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    // emit to customer room
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id.toString()}`).emit('order_status', {
        orderId: order._id.toString(),
        status: order.status,
        order
      });
    }

    return res.json({ success: true, order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  console.log("PATCH /orders/:id/status HIT");
  console.log("Order ID:", req.params.id);
  console.log("New status:", req.body.status);
  try {
    const order = await Order.findById(req.params.id).populate('orderItems.menuItemId');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    return res.json(order);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
