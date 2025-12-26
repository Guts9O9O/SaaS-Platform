// backend/src/routes/adminOrderRoutes.js
const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const adminAuth = require('../../middleware/authAdmin');
const { Parser } = require('json2csv');

/**
 * GET LIVE ORDERS GROUPED BY TABLE
 * GET /api/admin/orders/live-by-table
 */
router.get('/live-by-table', adminAuth, async (req, res) => {
  try {
    const { restaurantId, isSuperAdmin } = resolveRestaurantContext(req);

    if (!restaurantId && !isSuperAdmin) {
      return res.status(400).json({ message: "Restaurant context missing" });
    }

    const filter = {
      billed: false,
      status: { $nin: ["CANCELLED", "REJECTED"] },
    };

    if (!isSuperAdmin) {
      filter.restaurantId = restaurantId;
    } else if (restaurantId) {
      filter.restaurantId = restaurantId;
    }

    // Fetch latest orders first
    const orders = await Order.find(filter)
      .populate("tableId")
      .sort({ createdAt: -1 })
      .lean();

    // Group by table
    const tableMap = new Map();

    for (const order of orders) {
      const table = order.tableId;
      if (!table) continue;

      const key = table._id.toString();

      if (!tableMap.has(key)) {
        tableMap.set(key, {
          tableId: table._id,
          tableCode: table.tableCode,
          lastOrderAt: order.createdAt,
          orders: [],
          totalOpenAmount: 0,
        });
      }

      const group = tableMap.get(key);
      group.orders.push(order);
      group.totalOpenAmount += Number(order.totalAmount || 0);

      if (order.createdAt > group.lastOrderAt) {
        group.lastOrderAt = order.createdAt;
      }
    }

    // Sort tables by latest activity
    const result = Array.from(tableMap.values()).sort(
      (a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt)
    );

    return res.json({
      success: true,
      tables: result,
    });
  } catch (err) {
    console.error("Live orders by table error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * Resolve restaurantId based on role
 * SUPER_ADMIN:
 *   - Can pass restaurantId explicitly
 *   - If not passed → sees ALL restaurants
 * RESTAURANT_ADMIN / STAFF:
 *   - Always locked to their restaurant
 */
const resolveRestaurantContext = (req) => {
  if (req.admin.role === 'SUPER_ADMIN') {
    return {
      restaurantId:
        req.query.restaurantId ||
        req.body.restaurantId ||
        req.params.restaurantId ||
        null,
      isSuperAdmin: true,
    };
  }

  return {
    restaurantId: req.admin.restaurantId,
    isSuperAdmin: false,
  };
};
/**
 * GET /api/admin/orders
 */
router.get('/', adminAuth, async (req, res) => {
  try {
    const { restaurantId, isSuperAdmin } = resolveRestaurantContext(req);

    const {
      status,
      tableId,
      page = 1,
      limit = 30,
      sort = 'createdAt:desc',
      search,
    } = req.query;

    const filter = {};

    // 🔐 Isolation rule
    if (!isSuperAdmin) {
      filter.restaurantId = restaurantId;
    } else if (restaurantId) {
      filter.restaurantId = restaurantId;
    }

    if (status) filter.status = status;
    if (tableId) filter.tableId = tableId;

    if (search) {
      filter.$or = [
        { notes: { $regex: search, $options: 'i' } },
        { 'items.name': { $regex: search, $options: 'i' } },
      ];
    }
    const [sortField, sortDir] = sort.split(':');
    const sortObj = { [sortField]: sortDir === 'asc' ? 1 : -1 };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;
    
    const total = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .populate('tableId')
      .populate('customerId')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    return res.json({
      success: true,
      meta: { total, page: pageNum, limit: limitNum },
      orders,
    });
  } catch (err) {
    console.error('Admin list orders error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/orders/export/csv
 */
router.get('/export/csv', adminAuth, async (req, res) => {
  try {
    const { restaurantId, isSuperAdmin } = resolveRestaurantContext(req);
    const { status } = req.query;

    const filter = {};
    if (!isSuperAdmin) filter.restaurantId = restaurantId;
    else if (restaurantId) filter.restaurantId = restaurantId;

    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .lean()
      .limit(1000)
      .sort({ createdAt: -1 });

    const rows = orders.map((o) => ({
      orderId: o._id.toString(),
      createdAt: o.createdAt,
      status: o.status,
      tableId: o.tableId ? o.tableId.toString() : '',
      customerId: o.customerId ? o.customerId.toString() : '',
      totalAmount: o.totalAmount,
      items: o.orderItems.map((i) => `${i.name} x${i.quantity}`).join(' | '),
      notes: o.notes || '',
      cancelReason: o.cancelReason || '',
    }));

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.header('Content-Type', 'text/csv');
    res.attachment(`orders_${Date.now()}.csv`);
    return res.send(csv);
  } catch (err) {
    console.error('Export CSV error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/orders/:id
 */
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const { restaurantId, isSuperAdmin } = resolveRestaurantContext(req);

    const filter = { _id: req.params.id };
    if (!isSuperAdmin) filter.restaurantId = restaurantId;
    else if (restaurantId) filter.restaurantId = restaurantId;

    const order = await Order.findOne(filter)
      .populate('tableId')
      .populate('customerId');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    return res.json({ success: true, order });
  } catch (err) {
    console.error('Get admin order error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Allowed status transitions
 */
const ALLOWED_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
];

/**
 * PATCH /api/admin/orders/:id/status
 */
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const { restaurantId, isSuperAdmin } = resolveRestaurantContext(req);
    const { status, cancelReason } = req.body;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid or missing status' });
    }

    const filter = { _id: req.params.id };
    if (!isSuperAdmin) filter.restaurantId = restaurantId;
    else if (restaurantId) filter.restaurantId = restaurantId;

    const order = await Order.findOne(filter);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      return res
        .status(400)
        .json({ message: `Cannot change status from ${order.status}` });
    }

    if (status === 'CANCELLED') {
      order.cancelReason = cancelReason || 'Cancelled by admin';
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    // 🔔 Emit updates
    const io = req.app.get('io');
    if (io) {
      const restaurantRoom = `restaurant_${order.restaurantId.toString()}`;
      
      io.to(restaurantRoom).emit('order_updated', {
        orderId: order._id.toString(),
        order,
      });

      io.to(`order_${order._id.toString()}`).emit('order_status', {
        orderId: order._id.toString(),
        status: order.status,
        order,
      });
    }

    return res.json({ success: true, order });
  } catch (err) {
    console.error('Update order status error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
