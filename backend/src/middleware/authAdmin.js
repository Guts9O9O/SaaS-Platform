const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET || 'replace_this_secret';

const adminAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    // 🔍 DEBUG 1
    console.log("[ADMIN AUTH] Authorization header:", authHeader);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 🔍 DEBUG 2
    console.log("[ADMIN AUTH] Extracted token:", token);

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated (no token)' });
    }

    // 🔍 DEBUG 3
    console.log(
      "[ADMIN AUTH] Token dot count:",
      token.split(".").length - 1
    );

    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'STAFF'].includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Attach restaurant context (from JWT, fallback to DB)
    req.admin = {
      userId: user._id,
      role: user.role,
      restaurantId: decoded.restaurantId || user.restaurantId || null
    };

    req.user = user;
    next();
  } catch (err) {
    console.error('[ADMIN AUTH ERROR]', err.message || err);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = adminAuth;
