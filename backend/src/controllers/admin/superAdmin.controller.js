const Restaurant = require("../../models/Restaurant");
const User = require("../../models/User");
const slugify = require('slugify');
const Table = require("../../models/Table");
const { generateQrDataUrl } = require("../../utils/qrGenerator");

async function generateUniqueSlug(baseName) {
  const base = slugify(baseName, { lower: true, strict: true });
  let slug = base;
  let counter = 1;

  while (await Restaurant.exists({ slug })) {
    counter += 1;
    slug = `${base}-${counter}`;
  }

  return slug;
}

// Create Restaurant
exports.createRestaurant = async (req, res) => {
  try {
    const { name, contact, status, adminEmail, adminName, adminPassword } = req.body;

    if (!name || !contact) {
      return res.status(400).json({ message: "Restaurant name and contact are required" });
    }

    const slug = await generateUniqueSlug(name);

    const restaurant = await Restaurant.create({
      name,
      contact,
      status: status || "ACTIVE",
      slug,
    });

    let adminUser = null;

    if (adminEmail) {
      // find or create restaurant admin
      adminUser = await User.findOne({ email: adminEmail });

      if (!adminUser) {
        if (!adminPassword) {
          return res.status(400).json({ message: "adminPassword required to create new admin user" });
        }

        const bcrypt = require("bcryptjs");
        const passwordHash = await bcrypt.hash(adminPassword, 10);

        adminUser = await User.create({
          name: adminName || "Restaurant Admin",
          email: adminEmail,
          passwordHash,
          role: "RESTAURANT_ADMIN",
          restaurantId: restaurant._id,
        });
      } else {
        adminUser.role = "RESTAURANT_ADMIN";
        adminUser.restaurantId = restaurant._id;
        await adminUser.save();
      }
    }

    return res.status(201).json({ restaurant, adminUser });
  } catch (err) {
    console.error("Create restaurant error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update Restaurant
exports.updateRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name, contact, status } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(restaurantId, { name, contact, status }, { new: true });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    return res.status(200).json({ restaurant });
  } catch (err) {
    console.error("Update restaurant error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete Restaurant
exports.deleteRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findByIdAndDelete(restaurantId);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    return res.status(200).json({ message: "Restaurant deleted" });
  } catch (err) {
    console.error("Delete restaurant error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get All Restaurants
exports.getRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    return res.status(200).json({ restaurants });
  } catch (err) {
    console.error("Get restaurants error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update Subscription Status (active, inactive, suspended)
exports.updateSubscriptionStatus = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { subscriptionStatus, plan } = req.body; // expect subscription status and plan

    // Validate the input
    if (!["TRIAL", "ACTIVE", "SUSPENDED"].includes(subscriptionStatus)) {
      return res.status(400).json({ message: "Invalid subscription status" });
    }

    if (!['FREE', 'BASIC', 'PRO'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan type' });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { subscriptionStatus, plan },
      { new: true } // return the updated document
    );

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    return res.status(200).json({ restaurant });
  } catch (err) {
    console.error("Update subscription status error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Bulk create tables for a restaurant (SUPER ADMIN)
exports.bulkCreateTables = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // supports either count or explicit codes
    const { count, prefix = "T", startFrom = 1, codes } = req.body;

    let tableCodes = [];

    if (Array.isArray(codes) && codes.length) {
      tableCodes = codes.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
    } else {
      const n = Number(count || 0);
      if (!n || n < 1 || n > 500) {
        return res.status(400).json({ message: "count must be between 1 and 500, or provide codes[]" });
      }
      const start = Number(startFrom || 1);
      for (let i = 0; i < n; i++) {
        tableCodes.push(`${String(prefix).toUpperCase()}${start + i}`);
      }
    }

    // Create only non-existing tables (idempotent)
    const existing = await Table.find({ restaurantId, tableCode: { $in: tableCodes } })
      .select("tableCode")
      .lean();

    const existingSet = new Set(existing.map((t) => t.tableCode));
    const toCreate = tableCodes
      .filter((code) => !existingSet.has(code))
      .map((code) => ({ restaurantId, tableCode: code, isActive: true }));

    const created = toCreate.length ? await Table.insertMany(toCreate, { ordered: false }) : [];

    return res.status(201).json({
      message: "Bulk table creation done",
      requested: tableCodes.length,
      createdCount: created.length,
      skippedCount: existing.length,
      createdTables: created,
      skippedTables: Array.from(existingSet),
    });
  } catch (err) {
    console.error("bulkCreateTables error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// Generate QR codes for tables of a restaurant (SUPER ADMIN)
exports.getTableQrCodes = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { baseUrl } = req.query;

    if (!baseUrl) {
      return res.status(400).json({ message: "baseUrl query param required" });
    }

    const restaurant = await Restaurant.findById(restaurantId).select("slug name").lean();
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const tables = await Table.find({ restaurantId }).sort({ tableCode: 1 }).lean();

    const cleanBase = baseUrl.replace(/\/$/, "");

    const results = [];
    for (const t of tables) {
      const qrText = `${cleanBase}/r/${restaurant.slug}/t/${t.tableCode}`;
      const qrDataUrl = await generateQrDataUrl(qrText);

      results.push({
        tableId: t._id,
        tableCode: t.tableCode,
        qrText,
        qrDataUrl,
      });
    }

    return res.json({
      restaurantId,
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
      count: results.length,
      qrs: results,
    });
  } catch (err) {
    console.error("getTableQrCodes error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};