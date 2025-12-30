const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
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

    // 🔑 CUSTOMER SESSION (instead of customerId)
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MenuItem",
          required: true,
        },
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "ACCEPTED",
        "IN_KITCHEN",
        "READY",
        "SERVED",
        "COMPLETED",
        "CANCELLED",
        "REJECTED"
      ],
      default: "PENDING",
      index: true,
    },

    cancelReason: String,
    notes: String,

        // ✅ BILLING FLAGS
    billed: {
      type: Boolean,
      default: false,
      index: true,
    },

    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill", // (Bill model will be added in next change set)
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Order||
  mongoose.model("Order", OrderSchema);
