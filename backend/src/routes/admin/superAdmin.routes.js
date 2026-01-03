const express = require("express");
const router = express.Router();
const {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurants,
  updateSubscriptionStatus,
  bulkCreateTables,
  getTableQrCodes,
} = require("../../controllers/admin/superAdmin.controller");

const authSuperAdmin = require("../../middleware/authSuperAdmin");

router.use(authSuperAdmin);

router.get("/restaurants", getRestaurants);
router.post("/restaurants", createRestaurant);
router.put("/restaurants/:restaurantId", updateRestaurant);
router.put("/restaurants/:restaurantId/subscription", updateSubscriptionStatus);
router.delete("/restaurants/:restaurantId", deleteRestaurant);
router.post("/restaurants/:restaurantId/tables/bulk", bulkCreateTables);
router.get("/restaurants/:restaurantId/tables/qrs", getTableQrCodes);

module.exports = router;
