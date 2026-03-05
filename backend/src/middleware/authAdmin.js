const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");

module.exports = async function authAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    if (!process.env.JWT_SECRET) {
      console.error("[authAdmin] FATAL: JWT_SECRET not set");
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) return res.status(401).json({ message: "Invalid token" });

    const user = await User.findById(decoded.userId).select("_id role restaurantId email name");
    if (!user) return res.status(401).json({ message: "User not found" });

    if (!["SUPER_ADMIN", "RESTAURANT_ADMIN"].includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (user.role === "RESTAURANT_ADMIN") {
      if (!user.restaurantId) return res.status(403).json({ message: "Restaurant context missing" });

      // ✅ CHECK SUBSCRIPTION — block suspended restaurants
      const restaurant = await Restaurant.findById(user.restaurantId).select("isActive subscriptionStatus").lean();
      if (!restaurant) return res.status(403).json({ message: "Restaurant not found" });
      if (!restaurant.isActive) return res.status(403).json({ message: "Restaurant account is inactive. Contact support." });
      if (restaurant.subscriptionStatus === "SUSPENDED") return res.status(403).json({ message: "Restaurant subscription is suspended. Contact support." });
    }

    req.user = user;
    req.restaurantId = user.restaurantId;
    req.admin = { userId: user._id, role: user.role, restaurantId: user.restaurantId };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return res.status(401).json({ message: "Token expired" });
    if (err.name === "JsonWebTokenError") return res.status(401).json({ message: "Invalid token" });
    console.error("[authAdmin ERROR]", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};