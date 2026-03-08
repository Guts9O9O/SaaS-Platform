const router = require("express").Router();
const authWaiter = require("../../middleware/authWaiter");
const ctrl = require("../../controllers/waiter/table.controller");

router.use(authWaiter);
router.get("/my-tables", ctrl.myTables);
router.get("/orders", ctrl.getTableOrders); // ✅ NEW: fetch all unbilled orders for assigned tables

module.exports = router;