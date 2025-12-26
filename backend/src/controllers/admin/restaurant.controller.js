const Restaurant = require("../../models/Restaurant");
const slugify = require("slugify");

/* ---------------- CREATE ---------------- */
exports.createRestaurant = async (req, res) => {
  try {
    if (req.admin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { name, ownerName, ownerEmail, logoUrl, subscriptionEnd } = req.body;

    if (!name || !ownerEmail) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const slug = slugify(name, { lower: true, strict: true });

    const exists = await Restaurant.findOne({ slug });
    if (exists) {
      return res.status(400).json({ message: "Restaurant already exists" });
    }

    const restaurant = await Restaurant.create({
      name,
      slug,
      ownerName,
      ownerEmail,
      logoUrl,
      subscriptionEnd,
      isActive: true,
    });

    res.status(201).json(restaurant);
  } catch (err) {
    console.error("Create restaurant error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- GET ALL ---------------- */
exports.getAllRestaurants = async (req, res) => {
  try {
    if (req.admin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    res.json(restaurants);
  } catch (err) {
    console.error("Get restaurants error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- UPDATE ---------------- */
exports.updateRestaurant = async (req, res) => {
  try {
    if (req.admin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updates = { ...req.body };
    delete updates.slug;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    res.json(restaurant);
  } catch (err) {
    console.error("Update restaurant error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- STATUS ---------------- */
exports.updateRestaurantStatus = async (req, res) => {
  try {
    if (req.admin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { isActive } = req.body;

    // 🔒 CRITICAL GUARD
    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ message: "isActive must be boolean" });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    res.json(restaurant);
  } catch (err) {
    console.error("Update restaurant status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
