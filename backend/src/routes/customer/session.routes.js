const express = require("express");
const router = express.Router();
const controller = require("../../controllers/customer/session.controller");

// ✅ Check existing session — called on every page load before creating new one
router.get("/check", controller.checkSession);

// Create new session — only called if /check returns 401
router.post("/", controller.createSession);

module.exports = router;
