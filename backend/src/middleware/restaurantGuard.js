const Restaurant = require("../models/Restaurant");

module.exports = async function restaurantGuard(req, res, next) {
  try {
    // ✅ Super Admin bypass
    if (req.admin?.role === "SUPER_ADMIN") {
      return next();
    }

    const restaurantId =
      req.restaurantId ||
      req.admin?.restaurantId ||
      req.user?.restaurantId ||
      req.params.restaurantId;

    if (!restaurantId) {
      return res.status(403).json({ message: "Restaurant context missing" });
    }

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    if (restaurant.status !== "ACTIVE") {
      return res.status(403).json({
        code: "RESTAURANT_DISABLED",
        message: "Restaurant account is disabled",
      });
    }

    if (restaurant.subscriptionStatus !== "ACTIVE") {
      return res.status(402).json({
        code: "SUBSCRIPTION_REQUIRED",
        message: "Subscription expired or inactive",
      });
    }

    req.restaurant = restaurant;
    next();
  } catch (err) {
    console.error("restaurantGuard error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
