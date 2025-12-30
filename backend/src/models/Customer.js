const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    // PIN or password (OTP later)
    pinHash: {
      type: String,
      required: null,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    marketingOptIn: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// 🚨 Enforce uniqueness per restaurant
CustomerSchema.index({ restaurantId: 1, phone: 1 }, { unique: true });

module.exports =
  mongoose.models.Customer ||
  mongoose.model("Customer", CustomerSchema);

