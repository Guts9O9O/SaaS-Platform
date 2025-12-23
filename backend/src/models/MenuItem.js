const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory' },
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  images: [String],
  isAvailable: { type: Boolean, default: true },
  variants: [{ name: String, price: Number }], // e.g. small/large
  addons: [{ name: String, price: Number }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MenuItem', MenuItemSchema);
