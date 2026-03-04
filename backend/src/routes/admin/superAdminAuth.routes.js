const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt"); // ✅ FIXED: was bcryptjs, now matches rest of codebase
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const jwtSecret = process.env.JWT_SECRET || "replace_this_secret";

// POST /api/admin/super-admin/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    if (user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Not a super admin account" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role, restaurantId: null },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Super admin login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/super-admin/create
// Creates a new super admin (requires existing super admin token)
router.post("/create", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
    });

    return res.status(201).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Super admin create error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;