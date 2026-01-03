const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

const jwtSecret = process.env.JWT_SECRET || "replace_this_secret";

module.exports = async function authSuperAdmin(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization || "";
    // ✅ Allow Bearer token
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
    // ✅ Allow cookie token fallback (like authAdmin.js)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 🔍 DEBUG (safe place)
    console.log("[authSuperAdmin] Authorization header:", authHeader ? "present" : "missing");
    console.log("[authSuperAdmin] Cookie token:", req.cookies?.token ? "present" : "missing");

    if (!token) {
      return res.status(401).json({ message: "Not authenticated (no token)" });
    }

    console.log("[authSuperAdmin] token dot count:", (token.match(/\./g) || []).length);
    console.log("[authSuperAdmin] token preview:", token.slice(0, 20));

    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded?.userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await User.findById(decoded.userId).select("_id role email name");
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
    console.error("[authSuperAdmin] ERROR:", err.name, err.message);
    // Most helpful errors:
    // - invalid signature => JWT_SECRET mismatch
    // - jwt malformed => token copy/paste issue
    // - jwt expired => expired token
    return res.status(401).json({ message: "Authentication failed" });
  }
};
