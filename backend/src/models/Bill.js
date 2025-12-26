const mongoose = require("mongoose");

const BillItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    name: { type: String, required: true },   // snapshot
    price: { type: Number, required: true },  // snapshot
    quantity: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const BillSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
      index: true,
    },

    orderIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
    ],

    items: [BillItemSchema],

    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },

    status: { type: String, enum: ["CLOSED"], default: "CLOSED" },

    closedAt: { type: Date, default: Date.now },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, // adjust if your admin model name differs
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", BillSchema);
