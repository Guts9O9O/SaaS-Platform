require("dotenv").config();
const mongoose = require("mongoose");
const Restaurant = require("./src/models/Restaurant");
const Table = require("./src/models/Table");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const restaurant = await Restaurant.findOne({ slug: "demo-restaurant" });
  if (!restaurant) {
    console.log("❌ Restaurant 'demo-restaurant' not found in DB");
    process.exit(1);
  }

  const existing = await Table.findOne({
    restaurantId: restaurant._id,
    tableCode: "T1",
  });

  if (existing) {
    // Make sure it's active
    existing.isActive = true;
    await existing.save();
    console.log("✅ Table T1 already exists — set to active");
  } else {
    await Table.create({
      restaurantId: restaurant._id,
      tableCode: "T1",
      isActive: true,
    });
    console.log("✅ Table T1 created for demo-restaurant");
  }

  await mongoose.disconnect();
}

main().catch(console.error);