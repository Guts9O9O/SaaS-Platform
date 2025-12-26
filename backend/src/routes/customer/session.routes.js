const express = require("express");
const router = express.Router();
const controller = require("../../controllers/customer/session.controller");

router.post("/start", controller.createSession);

module.exports = router;
