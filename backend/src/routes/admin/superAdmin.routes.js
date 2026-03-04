const express = require("express");
const router = express.Router();
const {
  createRestaurant,
  updateRestaurant,
  updateSubscription,        // ✅ NEW
  deleteRestaurant,
  getRestaurants,
  getRestaurantById,
  updateSubscriptionStatus,
  bulkCreateTables,
  getTableQrCodes,
  updateRestaurantLimits,
  getAdminUser,              // ✅ NEW
  resetAdminPassword,        // ✅ NEW
} = require("../../controllers/admin/superAdmin.controller");
const authSuperAdmin = require("../../middleware/authSuperAdmin");

router.use(authSuperAdmin);

router.get("/restaurants", getRestaurants);
router.get("/restaurants/:restaurantId", getRestaurantById);
router.get("/restaurants/:restaurantId/admin-user", getAdminUser);           // ✅ NEW
router.post("/restaurants", createRestaurant);
router.post("/restaurants/:restaurantId/reset-admin-password", resetAdminPassword); // ✅ NEW
router.put("/restaurants/:restaurantId", updateRestaurant);
router.put("/restaurants/:restaurantId/limits", updateRestaurantLimits);
router.put("/restaurants/:restaurantId/subscription", updateSubscription);   // ✅ NEW (replaces updateSubscriptionStatus)
router.delete("/restaurants/:restaurantId", deleteRestaurant);
router.post("/restaurants/:restaurantId/tables/bulk", bulkCreateTables);
router.get("/restaurants/:restaurantId/tables/qrs", getTableQrCodes);

module.exports = router;