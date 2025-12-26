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

router.get("/bill/:billId", authAdmin, getBillById);
router.get("/table/:tableId/history", authAdmin, getBillHistoryForTable);

module.exports = router;
