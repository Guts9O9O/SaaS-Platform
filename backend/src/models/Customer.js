const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  lastSeen: Date
});

module.exports = mongoose.model('Customer', CustomerSchema);
