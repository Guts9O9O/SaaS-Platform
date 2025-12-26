const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const connectDB = require("../config/db");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");

(async () => {
  try {
    await connectDB();

    // 🔹 CHANGE THESE VALUES
    const email = "admin@demo.com";
    const password = "Admin@123";
    const restaurantSlug = "demo-restaurant";

    const restaurant = await Restaurant.findOne({ slug: restaurantSlug });
    if (!restaurant) {
      console.error("Restaurant not found");
      process.exit(1);
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("Admin already exists");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name: "Demo Admin",
      email,
      password: hashedPassword,
      role: "RESTAURANT_ADMIN",
      restaurantId: restaurant._id,
    });

    console.log("✅ Admin created:");
    console.log({
      email: admin.email,
      password,
      restaurantId: restaurant._id.toString(),
    });

    process.exit(0);
  } catch (err) {
    console.error("Admin creation failed:", err);
    process.exit(1);
  }
})();
