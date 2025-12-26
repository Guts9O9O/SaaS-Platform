const CustomerSession = require("../models/CustomerSession");

const SESSION_DURATION_HOURS = 6;

module.exports = async function customerSession(req, res, next) {
  try {
    let sessionId = req.cookies?.customerSessionId;

    if (sessionId) {
      const existing = await CustomerSession.findById(sessionId);
      if (existing && existing.isActive) {
        req.customerSession = existing;
        return next();
      }
    }

    // session not found → must be created explicitly
    return res.status(401).json({
      message: "Customer session required",
    });
  } catch (err) {
    console.error("Customer session middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
