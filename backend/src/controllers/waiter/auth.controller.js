const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body || {};

    // ✅ FIX: validate phone instead of email
    if (!phone || !password) {
      return res.status(400).json({ message: "phone and password are required" });
    }

    // ✅ FIX: look up by phone instead of email
    const user = await User.findOne({ phone: phone.trim(), role: "STAFF" });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // ✅ FIX: 7d expiry instead of 30d
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone, // ✅ FIX: return phone not email
        role: user.role,
        restaurantId: user.restaurantId,
      },
    });
  } catch (e) {
    console.error("[WAITER LOGIN ERROR]", e);
    return res.status(500).json({ message: "Server error" });
  }
};