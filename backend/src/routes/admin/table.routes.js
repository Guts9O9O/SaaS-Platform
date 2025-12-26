const express = require("express");
const router = express.Router();
const authAdmin = require("../../middleware/authAdmin");

const {
  createTable,
  getTables,
  updateTableStatus,
} = require("../../controllers/admin/table.controller");

router.use(authAdmin);

/* Restaurant Admin only */
router.post("/", createTable);
router.get("/", getTables);
router.patch("/:id/status", updateTableStatus);

module.exports = router;
