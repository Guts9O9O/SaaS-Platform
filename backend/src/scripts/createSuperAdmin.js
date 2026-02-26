/**
 * ONE-TIME SCRIPT: Create Super Admin user in MongoDB Atlas
 *
 * Run once from your backend root:
 *   node src/scripts/createSuperAdmin.js
 *
 * Set these in your .env before running:
 *   MONGO_URI=mongodb+srv://...
 *   JWT_SECRET=your_secret
 *   SUPER_ADMIN_EMAIL=you@example.com
 *   SUPER_ADMIN_PASSWORD=yourStrongPassword
 *   SUPER_ADMIN_NAME=Super Admin
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function main() {
  const {
    MONGO_URI,
    SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_PASSWORD,
    SUPER_ADMIN_NAME = "Super Admin",
  } = process.env;

  if (!MONGO_URI) {
    console.error("❌ MONGO_URI not set in .env");
    process.exit(1);
  }
  if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
    console.error(
      "❌ Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env before running"
    );
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB Atlas");

  // Check if super admin already exists
  const existing = await User.findOne({ role: "SUPER_ADMIN" });
  if (existing) {
    console.log(`⚠️  Super admin already exists: ${existing.email}`);
    console.log("   If you need to reset it, delete the document in Atlas first.");
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
  const admin = await User.create({
    name: SUPER_ADMIN_NAME,
    email: SUPER_ADMIN_EMAIL.toLowerCase().trim(),
    passwordHash,
    role: "SUPER_ADMIN",
    restaurantId: null,
  });

  console.log("✅ Super admin created successfully!");
  console.log(`   Name:  ${admin.name}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   ID:    ${admin._id}`);
  console.log("\n   You can now log in at /super-admin/login");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});