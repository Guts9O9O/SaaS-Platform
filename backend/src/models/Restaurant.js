const mongoose = require("mongoose");

const RestaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    /* -------- OWNER DETAILS -------- */
    ownerName: {
      type: String,
      trim: true,
    },

    ownerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    logoUrl: {
      type: String,
    },

    /* -------- SUBSCRIPTION -------- */
    subscriptionStatus: {
      type: String,
      enum: ["TRIAL", "ACTIVE", "SUSPENDED"],
      default: "TRIAL",
    },

    subscriptionEnd: {
      type: Date,
    },

    plan: {
      type: String,
      enum: ["FREE", "BASIC", "PRO"],
      default: "FREE",
    },

    /* -------- SYSTEM -------- */
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Restaurant", RestaurantSchema);
