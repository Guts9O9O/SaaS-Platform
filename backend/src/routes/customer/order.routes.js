const express = require("express");
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
} = require("../../controllers/customer/order.controller");

// customer
router.post("/", placeOrder);
router.get("/my", getMyOrders);

module.exports = router;
