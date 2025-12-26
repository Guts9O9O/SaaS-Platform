const express = require("express");
const {
  getPublicMenuBySlug,
} = require("../../controllers/customer/menuPublic.controller");

const router = express.Router();

router.get("/public/:restaurantSlug", getPublicMenuBySlug);

module.exports = router;
