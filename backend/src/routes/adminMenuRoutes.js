// backend/src/routes/adminMenuRoutes.js
const express = require('express');
const router = express.Router();
const MenuCategory = require('../models/MenuCategory');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const adminAuth = require('../middleware/authAdmin');

/**
 * Helper: resolve restaurantId from req.user or body (SUPER_ADMIN may pass restaurantId)
 */
const resolveRestaurantId = (req) => {
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    return req.body.restaurantId || req.query.restaurantId || req.params.restaurantId || null;
  }
  return req.user ? req.user.restaurantId : null;
};

/* ---------- CATEGORY ROUTES ---------- */

// Create category
// POST /api/admin/menu/categories
router.post('/categories', adminAuth, async (req, res) => {
  try {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required for category creation' });

    const { name, position = 0, isActive = true } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });

    // verify restaurant exists and is active
    const rest = await Restaurant.findById(restaurantId);
    if (!rest) return res.status(404).json({ message: 'Restaurant not found' });

    const category = await MenuCategory.create({ restaurantId, name, position, isActive });
    return res.json({ success: true, category });
  } catch (err) {
    console.error('Create category error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// List categories for restaurant
// GET /api/admin/menu/categories?restaurantId=...
router.get('/categories', adminAuth, async (req, res) => {
  try {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });

    const categories = await MenuCategory.find({ restaurantId }).sort({ position: 1, name: 1 });
    return res.json({ success: true, categories });
  } catch (err) {
    console.error('List categories error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Update category
// PUT /api/admin/menu/categories/:id
router.put('/categories/:id', adminAuth, async (req, res) => {
  try {
    const catId = req.params.id;
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });

    const update = {};
    ['name', 'position', 'isActive'].forEach(k => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });

    const category = await MenuCategory.findOneAndUpdate(
      { _id: catId, restaurantId },
      { $set: update },
      { new: true }
    );
    if (!category) return res.status(404).json({ message: 'Category not found' });
    return res.json({ success: true, category });
  } catch (err) {
    console.error('Update category error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete category
// DELETE /api/admin/menu/categories/:id
router.delete('/categories/:id', adminAuth, async (req, res) => {
  try {
    const catId = req.params.id;
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });

    const deleted = await MenuCategory.findOneAndDelete({ _id: catId, restaurantId });
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    // (Optional) Consider soft-delete and/or reassign items in this category.
    return res.json({ success: true, message: 'Category deleted', category: deleted });
  } catch (err) {
    console.error('Delete category error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ---------- MENU ITEM ROUTES ---------- */

// Create menu item
// POST /api/admin/menu/items
router.post('/items', adminAuth, async (req, res) => {
  try {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });

    const {
      categoryId,
      name,
      description = '',
      price,
      images = [],
      isAvailable = true,
      variants = [],
      addons = []
    } = req.body;

    if (!name || price === undefined) return res.status(400).json({ message: 'Item name and price are required' });

    // validate category belongs to restaurant (if provided)
    if (categoryId) {
      const cat = await MenuCategory.findOne({ _id: categoryId, restaurantId });
      if (!cat) return res.status(400).json({ message: 'Invalid category for this restaurant' });
    }

    const item = await MenuItem.create({
      restaurantId,
      categoryId: categoryId || null,
      name,
      description,
      price: Number(price),
      images,
      isAvailable,
      variants,
      addons
    });

    return res.json({ success: true, item });
  } catch (err) {
    console.error('Create item error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// List items
// GET /api/admin/menu/items?restaurantId=...&categoryId=...
router.get('/items', adminAuth, async (req, res) => {
  try {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });

    const filter = { restaurantId };
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.isAvailable) filter.isAvailable = req.query.isAvailable === 'true';

    const items = await MenuItem.find(filter).sort({ name: 1 });
    return res.json({ success: true, items });
  } catch (err) {
    console.error('List items error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get single item
// GET /api/admin/menu/items/:id
router.get('/items/:id', adminAuth, async (req, res) => {
  try {
    const restaurantId = resolveRestaurantId(req);
    const item = await MenuItem.findOne({ _id: req.params.id, restaurantId });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    return res.json({ success: true, item });
  } catch (err) {
    console.error('Get item error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Update item
// PUT /api/admin/menu/items/:id
router.put('/items/:id', adminAuth, async (req, res) => {
  try {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });

    const update = {};
    const fields = ['categoryId','name','description','price','images','isAvailable','variants','addons'];
    fields.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    // if categoryId provided, validate
    if (update.categoryId) {
      const cat = await MenuCategory.findOne({ _id: update.categoryId, restaurantId });
      if (!cat) return res.status(400).json({ message: 'Invalid category for this restaurant' });
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId },
      { $set: update },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    return res.json({ success: true, item });
  } catch (err) {
    console.error('Update item error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete item
// DELETE /api/admin/menu/items/:id
router.delete('/items/:id', adminAuth, async (req, res) => {
  try {
    const restaurantId = resolveRestaurantId(req);
    const deleted = await MenuItem.findOneAndDelete({ _id: req.params.id, restaurantId });
    if (!deleted) return res.status(404).json({ message: 'Item not found' });
    return res.json({ success: true, message: 'Item deleted', item: deleted });
  } catch (err) {
    console.error('Delete item error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
