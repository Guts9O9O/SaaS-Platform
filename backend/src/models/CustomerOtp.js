const mongoose = require("mongoose");

const CustomerOtpSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    phone: { type: String, required: true, trim: true, index: true },

    purpose: {
      type: String,
      enum: ["LOGIN", "REGISTER"],
      required: true,
      index: true,
    },

    otpHash: { type: String, required: true },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL auto-delete
    },

    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },

    // Optional: bind OTP to session (prevents OTP reuse from another table)
    sessionId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CustomerOtp || mongoose.model("CustomerOtp", CustomerOtpSchema);
