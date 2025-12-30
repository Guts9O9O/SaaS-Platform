const express = require("express");
const router = express.Router();
const customerSession = require("../../middleware/customerSession");

const { requestOtp, verifyOtp, me } = require("../../controllers/customer/auth.controller");

// OTP flow
router.post("/request-otp", customerSession, requestOtp);
router.post("/verify-otp", customerSession, verifyOtp);

// check logged-in customer for this session
router.get("/me", customerSession, me);

module.exports = router;
