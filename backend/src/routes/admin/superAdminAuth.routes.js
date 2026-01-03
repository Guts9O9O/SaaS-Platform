const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");

const jwtSecret = process.env.JWT_SECRET || "replace_this_secret";

// POST /api/admin/super-admin/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    if (user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Not a super admin account" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

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

module.exports = router;
