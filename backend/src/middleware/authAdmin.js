const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function authAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await User.findById(decoded.userId).select(
      "_id role restaurantId email name"
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid token user" });
    }

    // ✅ ALLOW BOTH ADMINS
    if (!["SUPER_ADMIN", "RESTAURANT_ADMIN"].includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // ✅ Restaurant admin MUST have restaurantId
    if (user.role === "RESTAURANT_ADMIN" && !user.restaurantId) {
      return res.status(403).json({ message: "Restaurant context missing" });
    }

    req.user = user;

    // ✅ SINGLE SOURCE OF TRUTH
    req.restaurantId = user.restaurantId;

    // (OPTIONAL, backward compatibility if some controllers use req.admin)
    req.admin = {
      userId: user._id,
      role: user.role,
      restaurantId: user.restaurantId
    };

    next();
  } catch (err) {
    console.error("[ADMIN AUTH ERROR]", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
