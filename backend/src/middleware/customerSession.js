const CustomerSession = require("../models/CustomerSession");

module.exports = async function customerSession(req, res, next) {
  try {
    const token =
      req.cookies?.customerSessionId || req.cookies?.sessionId;

    if (!token) {
      return res.status(401).json({ message: "Customer session required" });
    }

    const existing = await CustomerSession.findOne({
      sessionId: token,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!existing) {
      return res.status(401).json({ message: "Customer session required" });
    }

    req.customerSession = existing;
    return next();
  } catch (err) {
    console.error("Customer session middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
