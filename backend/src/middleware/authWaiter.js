const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");

module.exports = async function authWaiter(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) return res.status(401).json({ message: "Invalid token payload" });

    const user = await User.findById(decoded.userId).select("_id role restaurantId email name");
    if (!user) return res.status(401).json({ message: "Invalid token user" });
    if (user.role !== "STAFF") return res.status(403).json({ message: "Forbidden" });
    if (!user.restaurantId) return res.status(403).json({ message: "Restaurant context missing" });

    // ✅ Block waiter access if restaurant is suspended/inactive
    const restaurant = await Restaurant.findById(user.restaurantId)
      .select("isActive subscriptionStatus").lean();
    if (!restaurant) return res.status(403).json({ message: "Restaurant not found" });
    if (!restaurant.isActive) return res.status(403).json({ message: "Restaurant account is inactive" });
    if (restaurant.subscriptionStatus === "SUSPENDED") return res.status(403).json({ message: "Restaurant subscription is suspended" });

    req.user = user;
    req.restaurantId = user.restaurantId;
    next();
  } catch (err) {
    console.error("[WAITER AUTH ERROR]", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};