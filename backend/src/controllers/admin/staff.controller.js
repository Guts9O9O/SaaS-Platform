const bcrypt = require("bcryptjs");
const User = require("../../models/User");

// CREATE
exports.createWaiter = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { name, phone, password } = req.body || {};

    if (!name || !phone || !password) {
      return res.status(400).json({ message: "name, phone, password are required" });
    }

    const existing = await User.findOne({ phone: phone.trim() });
    if (existing) {
      return res.status(409).json({ message: "Phone number already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const waiter = await User.create({
      name,
      phone: phone.trim(),
      passwordHash,
      role: "STAFF",
      restaurantId,
    });

    return res.status(201).json({
      message: "Waiter created",
      waiter: { _id: waiter._id, name: waiter.name, phone: waiter.phone, role: waiter.role },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};

// LIST
exports.listWaiters = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const waiters = await User.find({ restaurantId, role: "STAFF" })
      .select("_id name phone createdAt")
      .sort({ createdAt: -1 });
    return res.json({ waiters });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};

// UPDATE — name, phone, and optionally a new password
exports.updateWaiter = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { id } = req.params;
    const { name, phone, password } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({ message: "name and phone are required" });
    }

    // Ensure this waiter belongs to this restaurant
    const waiter = await User.findOne({ _id: id, restaurantId, role: "STAFF" });
    if (!waiter) return res.status(404).json({ message: "Waiter not found" });

    // Phone uniqueness — ignore the same waiter
    const phoneConflict = await User.findOne({ phone: phone.trim(), _id: { $ne: id } });
    if (phoneConflict) {
      return res.status(409).json({ message: "Phone number already in use" });
    }

    waiter.name = name;
    waiter.phone = phone.trim();

    // Only rehash if a new password was provided
    if (password && password.trim()) {
      waiter.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    await waiter.save();

    return res.json({
      message: "Waiter updated",
      waiter: { _id: waiter._id, name: waiter.name, phone: waiter.phone, role: waiter.role },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE
exports.deleteWaiter = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { id } = req.params;

    const deleted = await User.findOneAndDelete({ _id: id, restaurantId, role: "STAFF" });
    if (!deleted) return res.status(404).json({ message: "Waiter not found" });

    return res.json({ message: "Waiter deleted" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};