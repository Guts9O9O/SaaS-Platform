const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // ✅ FIX: No hardcoded secret fallback — fail loudly if JWT_SECRET missing
    if (!process.env.JWT_SECRET) {
      console.error("[ADMIN LOGIN] FATAL: JWT_SECRET not set in environment");
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ FIX: Only RESTAURANT_ADMIN and SUPER_ADMIN can log in here.
    // STAFF (waiters) use /api/waiter/auth/login instead.
    if (!["RESTAURANT_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return res.status(403).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    });
  } catch (err) {
    console.error("[ADMIN LOGIN ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
};