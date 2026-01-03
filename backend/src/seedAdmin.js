require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Restaurant = require("./models/Restaurant");

const MONGODB_URI = process.env.MONGODB_URI;
const SALT_ROUNDS = 10;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to DB for seeding");

  /* ===========================
     SUPER ADMIN
  ============================ */
  const SUPER_ADMIN_EMAIL = "realsuperadmin@ex.com";
  const SUPER_ADMIN_PASSWORD = "Guts54321!@!";

  let superAdmin = await User.findOne({ email: SUPER_ADMIN_EMAIL });

  if (!superAdmin) {
    const hash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, SALT_ROUNDS);
    superAdmin = await User.create({
      name: "Super Admin",
      email: SUPER_ADMIN_EMAIL,
      passwordHash: hash,
      role: "SUPER_ADMIN",
    });
    console.log("✅ Super Admin created:", SUPER_ADMIN_EMAIL);
  } else {
    console.log("ℹ️ Super Admin already exists:", SUPER_ADMIN_EMAIL);
  }

  /* ===========================
     RESTAURANT
  ============================ */
  let restaurant = await Restaurant.findOne({ slug: "demo-restaurant" });

  if (!restaurant) {
    restaurant = await Restaurant.create({
      name: "Demo Restaurant",
      slug: "demo-restaurant",
      contact: "9999999999",
      status: "ACTIVE",
      plan: "FREE",
      subscriptionStatus: "ACTIVE",
    });
    console.log("✅ Restaurant created: Demo Restaurant");
  } else {
    console.log("ℹ️ Restaurant already exists: Demo Restaurant");
  }

  /* ===========================
     RESTAURANT ADMIN
  ============================ */
  const REST_ADMIN_EMAIL = "realrestadmin@ex.com";
  const REST_ADMIN_PASSWORD = "Goku54321!@!";

  let restAdmin = await User.findOne({ email: REST_ADMIN_EMAIL });

  if (!restAdmin) {
    const hash = await bcrypt.hash(REST_ADMIN_PASSWORD, SALT_ROUNDS);
    restAdmin = await User.create({
      name: "Demo Restaurant Admin",
      email: REST_ADMIN_EMAIL,
      passwordHash: hash,
      role: "RESTAURANT_ADMIN",
      restaurantId: restaurant._id,
    });
    console.log("✅ Restaurant Admin created:", REST_ADMIN_EMAIL);
  } else {
    restAdmin.role = "RESTAURANT_ADMIN";
    restAdmin.restaurantId = restaurant._id;
    await restAdmin.save();
    console.log("ℹ️ Restaurant Admin already exists, reassigned restaurant");
  }

  console.log("\n🎉 SEEDING COMPLETE\n");
  console.log("Super Admin:", SUPER_ADMIN_EMAIL, "|", SUPER_ADMIN_PASSWORD);
  console.log("Restaurant Admin:", REST_ADMIN_EMAIL, "|", REST_ADMIN_PASSWORD);

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
