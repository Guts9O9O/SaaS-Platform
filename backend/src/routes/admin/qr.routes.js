const express = require("express");
const router = express.Router();
const authAdmin = require("../../middleware/authAdmin");
const { getTableQr } = require("../../controllers/admin/qr.controller");

router.use(authAdmin);

/**
 * GET /api/admin/tables/:tableId/qr
 */
router.get("/tables/:tableId/qr", getTableQr);

module.exports = router;
