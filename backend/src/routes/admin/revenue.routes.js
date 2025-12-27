const express = require("express");
const router = express.Router();
const authAdmin = require("../../middleware/authAdmin");
const {
  getDailyRevenue,
  getMonthlyRevenue,
  getRevenueSummary,
  getRevenueTrend,
  getTopItems,
} = require("../../controllers/admin/revenue.controller");

router.use(authAdmin);

router.get("/daily", getDailyRevenue);
router.get("/monthly", getMonthlyRevenue);
router.get("/summary", getRevenueSummary);

router.get("/trend", getRevenueTrend);    
router.get("/top-items", getTopItems);     

module.exports = router;
