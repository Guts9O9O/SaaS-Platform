const express = require("express");
const router = express.Router();
const authAdmin = require("../../middleware/authAdmin");

const {
  getOpenBillForTable,
  closeBillForTable,
  getBillById,
  getBillHistoryForTable,
} = require("../../controllers/admin/billing.controller");

// Admin-only
router.get(
  "/table/:tableId",
  authAdmin,
  getOpenBillForTable
);

router.post(
  "/table/:tableId/close",
  authAdmin,
  closeBillForTable
);

// ✅ recent bills (all tables)
router.get("/recent", authAdmin, require("../../controllers/admin/billing.controller").getRecentBills);

// ✅ table summary (all tables)
router.get("/table-summary", authAdmin, require("../../controllers/admin/billing.controller").getBillTableSummary);

router.get("/bill/:billId", authAdmin, getBillById);
router.get("/table/:tableId/history", authAdmin, getBillHistoryForTable);

module.exports = router;
