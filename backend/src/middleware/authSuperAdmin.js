const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function authSuperAdmin(req, res, next) {
  try {
    // ✅ Only accept Bearer token — no cookie fallback for super admin
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // ✅ FIX: No hardcoded secret fallback — if JWT_SECRET is missing in .env,
    // fail loudly so you know immediately rather than silently using an insecure key.
    if (!process.env.JWT_SECRET) {
      console.error("[authSuperAdmin] FATAL: JWT_SECRET is not set in environment");
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await User.findById(decoded.userId).select(
      "_id role email name"
    );
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    if (user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Forbidden: Super Admin only" });
    }

    req.user = user;
    req.admin = { userId: user._id, role: user.role, restaurantId: null };
    next();
  } catch (err) {
    // jwt expired → silently redirect (client handles this)
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    // jwt malformed / bad signature
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    console.error("[authSuperAdmin] ERROR:", err.message);
    return res.status(401).json({ message: "Authentication failed" });
  }
};