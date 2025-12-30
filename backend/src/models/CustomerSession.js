const mongoose = require("mongoose");

const CustomerSessionSchema = new mongoose.Schema(
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

    // ✅ production-style opaque session id (cookie stores this, not Mongo _id)
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // later: link to global customer
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
      default: null,
    },

    phone: { type: String, trim: true },

    isActive: { type: Boolean, default: true },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL
    },
  },
  { timestamps: true }
);

// ✅ prevent OverwriteModelError in dev
module.exports =
  mongoose.models.CustomerSession ||
  mongoose.model("CustomerSession", CustomerSessionSchema);
