const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: String,
  priceAtTime: Number,
  quantity: Number,
  variants: Object,
  addons: [Object],
  notes: String
});

const OrderSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  orderItems: [OrderItemSchema],
  totalAmount: Number,
  status: { type: String, enum: ['PENDING','ACCEPTED','IN_KITCHEN','READY',"PREPARING",'SERVED','COMPLETED','CANCELLED'], default: 'ACCEPTED' },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  cancelReason: String
});

module.exports = mongoose.model('Order', OrderSchema);
