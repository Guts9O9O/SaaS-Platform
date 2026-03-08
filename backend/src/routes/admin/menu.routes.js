const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const MenuCategory = require('../../models/MenuCategory');
const MenuItem = require('../../models/MenuItem');
const Restaurant = require('../../models/Restaurant');
const adminAuth = require('../../middleware/authAdmin');
const fileUpload = require("../../middleware/fileUpload");
const fs = require("fs");

const resolveRestaurantId = (req) => {
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    return req.body.restaurantId || req.query.restaurantId || req.params.restaurantId || null;
  }
  return req.user ? req.user.restaurantId : null;
};

async function getRestaurantVideoCount(restaurantId) {
  const agg = await MenuItem.aggregate([
    { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId) } },
    { $project: { videos: { $ifNull: ["$videos", []] } } },
    { $unwind: { path: "$videos", preserveNullAndEmptyArrays: false } },
    { $count: "count" },
  ]);
  return agg?.[0]?.count || 0;
}

/* ---------- CATEGORY ROUTES ---------- */
router.post('/categories', adminAuth, async (req, res) => {
  try {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required for category creation' });
    const { name, order = 0, isActive = true } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    const rest = await Restaurant.findById(restaurantId);
    if (!rest) return res.status(404).json({ message: 'Restaurant not found' });
    const category = await MenuCategory.create({ restaurantId, name, order, isActive });
    return res.json({ success: true, category });
  } catch (err) {
    console.error('Create category error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/categories', adminAuth, async (req, res) => {
  try {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });
    const categories = await MenuCategory.find({ restaurantId }).sort({ order: 1, name: 1 });
    return res.json({ success: true, categories });
  } catch (err) {
    console.error('List categories error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/categories/:id', adminAuth, async (req, res) => {
  try {
    const catId = req.params.id;
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });
    const update = {};
    ['name', 'order', 'isActive'].forEach(k => {
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

router.delete('/categories/:id', adminAuth, async (req, res) => {
  try {
    const catId = req.params.id;
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });
    const deleted = await MenuCategory.findOneAndDelete({ _id: catId, restaurantId });
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    return res.json({ success: true, message: 'Category deleted', category: deleted });
  } catch (err) {
    console.error('Delete category error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ---------- MENU ITEM ROUTES ---------- */
router.post('/items', adminAuth, async (req, res) => {
  try {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });
    const {
      categoryId, name, description = '', price,
      images = [], isActive = true, isVeg = true,
      prepTime = '',          // ✅ added
      variants = [], addons = []
    } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ message: 'Item name and price are required' });
    }
    if (categoryId) {
      const cat = await MenuCategory.findOne({ _id: categoryId, restaurantId });
      if (!cat) return res.status(400).json({ message: 'Invalid category for this restaurant' });
    }
    const item = await MenuItem.create({
      restaurantId,
      categoryId: categoryId || null,
      name, description,
      price: Number(price),
      images, isActive,
      isVeg: Boolean(isVeg),
      prepTime,               // ✅ added
      variants, addons
    });
    return res.json({ success: true, item });
  } catch (err) {
    console.error('Create item error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

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

router.put('/items/:id', adminAuth, async (req, res) => {
  try {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });
    const update = {};
    // ✅ prepTime added to allowed fields
    ['categoryId', 'name', 'description', 'price', 'images', 'isActive', 'isVeg', 'prepTime', 'variants', 'addons']
      .forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
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

router.post(
  "/items/:itemId/upload-video",
  adminAuth,
  fileUpload.single("video"),
  async (req, res) => {
    try {
      const restaurantId = resolveRestaurantId(req);
      if (!restaurantId) return res.status(400).json({ message: "restaurantId required" });
      const { itemId } = req.params;
      if (!req.file) return res.status(400).json({ message: "No video file uploaded" });
      const restaurant = await Restaurant.findById(restaurantId)
        .select("restaurantVideoLimit menuItemVideoLimit isActive").lean();
      if (!restaurant || restaurant.isActive === false) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(404).json({ message: "Restaurant not found or inactive" });
      }
      const item = await MenuItem.findOne({ _id: itemId, restaurantId });
      if (!item) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(404).json({ message: "Menu item not found" });
      }
      if (!Array.isArray(item.videos)) item.videos = [];
      const perItemLimit = Number(restaurant.menuItemVideoLimit ?? 0);
      if (perItemLimit > 0 && item.videos.length >= perItemLimit) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(403).json({ message: `Per-item video limit reached (${perItemLimit}). Contact Super Admin to increase.` });
      }
      const restaurantLimit = Number(restaurant.restaurantVideoLimit ?? 0);
      if (restaurantLimit > 0) {
        const currentTotal = await getRestaurantVideoCount(restaurantId);
        if (currentTotal >= restaurantLimit) {
          try { fs.unlinkSync(req.file.path); } catch {}
          return res.status(403).json({ message: `Restaurant video limit reached (${restaurantLimit}). Contact Super Admin to increase.` });
        }
      }
      const videoUrl = `/uploads/menu-videos/${req.file.filename}`;
      item.videos.push(videoUrl);
      await item.save();
      return res.status(201).json({ success: true, videoUrl, item });
    } catch (err) {
      console.error("Upload video error:", err);
      if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} }
      return res.status(500).json({ message: err.message || "Server error" });
    }
  }
);

module.exports = router;