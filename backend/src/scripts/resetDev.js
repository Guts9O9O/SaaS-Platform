require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Table = require("../models/Table");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const CustomerOtp = require("../models/CustomerOtp");
const CustomerSession = require("../models/CustomerSession");
const ServiceRequest = require("../models/ServiceRequest");
const Bill = require("../models/Bill");
const MenuCategory = require("../models/MenuCategory");
const MenuItem = require("../models/MenuItem");
const OtpLog = require("../models/OtpLog");

async function run() {
  await connectDB();

  // ✅ wipe collections (dev only)
  const collections = [
    Bill,
    ServiceRequest,
    Order,
    Table,
    MenuItem,
    MenuCategory,
    CustomerSession,
    CustomerOtp,
    Customer,
    OtpLog,
    User,
    Restaurant,
  ];

  for (const M of collections) {
    try {
      await M.deleteMany({});
      console.log("Cleared:", M.modelName);
    } catch (e) {
      console.log("Skip:", M?.modelName, e.message);
    }
  }

  console.log("✅ Dev reset complete");
  await mongoose.connection.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});