const express = require("express");
const router = express.Router();
const customerSession = require("../../middleware/customerSession");
const { requestOtp, verifyOtp, me, guestLogin } = require("../../controllers/customer/auth.controller");

// OTP flow (hidden for now, preserved for later)
router.post("/request-otp", customerSession, requestOtp);
router.post("/verify-otp", customerSession, verifyOtp);

// Check logged-in customer for this session
router.get("/me", customerSession, me);

// Guest auto-login (used while OTP is hidden)
router.post("/guest", customerSession, guestLogin);

module.exports = router;