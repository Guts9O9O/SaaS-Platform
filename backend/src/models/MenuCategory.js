const mongoose = require('mongoose');

const MenuCategorySchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true },
  position: Number,
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('MenuCategory', MenuCategorySchema);
