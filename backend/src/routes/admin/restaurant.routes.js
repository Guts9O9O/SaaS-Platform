const express = require("express");
const router = express.Router();
const {
  createRestaurant,
  getAllRestaurants,
  updateRestaurant,
  updateRestaurantStatus
} = require("../../controllers/admin/restaurant.controller");

const authAdmin = require("../../middleware/authAdmin");

router.use(authAdmin); // protect ALL routes

router.post("/", createRestaurant);
router.get("/", getAllRestaurants);
router.patch("/:id", updateRestaurant);
router.patch("/:id/status", updateRestaurantStatus);

module.exports = router;
