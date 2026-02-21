const express = require("express");
const router = express.Router();
const {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurants,
  getRestaurantById,        // ✅ NEW: added missing GET by ID
  updateSubscriptionStatus,
  bulkCreateTables,
  getTableQrCodes,
  updateRestaurantLimits,
} = require("../../controllers/admin/superAdmin.controller");
const authSuperAdmin = require("../../middleware/authSuperAdmin");

router.use(authSuperAdmin);

router.get("/restaurants", getRestaurants);
router.get("/restaurants/:restaurantId", getRestaurantById); // ✅ NEW: was completely missing
router.post("/restaurants", createRestaurant);
router.put("/restaurants/:restaurantId", updateRestaurant);
router.put("/restaurants/:restaurantId/limits", updateRestaurantLimits);
router.put("/restaurants/:restaurantId/subscription", updateSubscriptionStatus);
router.delete("/restaurants/:restaurantId", deleteRestaurant);
router.post("/restaurants/:restaurantId/tables/bulk", bulkCreateTables);
router.get("/restaurants/:restaurantId/tables/qrs", getTableQrCodes);

module.exports = router;