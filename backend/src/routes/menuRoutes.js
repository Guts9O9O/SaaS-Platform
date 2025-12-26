const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const MenuCategory = require('../models/MenuCategory');
const MenuItem = require('../models/MenuItem');

// GET /api/menu/:restaurantSlug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const restaurant = await Restaurant.findOne({ slug, isActive: true });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found or inactive' });

    const categories = await MenuCategory.find({ restaurantId: restaurant._id, isActive: true }).sort({ order: 1 });
    const items = await MenuItem.find({ restaurantId: restaurant._id, isAvailable: true });

    // group items by category for client convenience
    const grouped = categories.map(cat => {
      return {
        category: cat,
        items: items.filter(it => String(it.categoryId) === String(cat._id))
      };
    });

    return res.json({ restaurant, categories: grouped });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
