const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,

  // ✅ Email is now optional — STAFF (waiters) use phone instead.
  // SUPER_ADMIN and RESTAURANT_ADMIN still use email to log in.
  // sparse: true allows multiple documents with no email (null) while
  // still enforcing uniqueness among documents that DO have an email.
  email: {
    type: String,
    default: null,
    lowercase: true,
    trim: true,
    sparse: true,
  },

  // ✅ NEW: Phone number for waiter login
  // sparse: true — same reasoning as email above.
  phone: {
    type: String,
    default: null,
    trim: true,
    sparse: true,
  },

  passwordHash: { type: String, required: true },

  role: {
    type: String,
    enum: ["SUPER_ADMIN", "RESTAURANT_ADMIN", "STAFF"],
    default: "RESTAURANT_ADMIN",
  },

  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    default: null,
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.User || mongoose.model("User", UserSchema);