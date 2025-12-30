const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['SUPER_ADMIN','RESTAURANT_ADMIN','STAFF'],
    default: 'RESTAURANT_ADMIN'
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User||
  mongoose.model('User', UserSchema);
