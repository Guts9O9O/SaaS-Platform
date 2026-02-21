const router = require("express").Router();
const authWaiter = require("../../middleware/authWaiter");
const ctrl = require("../../controllers/waiter/table.controller");

router.use(authWaiter);
router.get("/my-tables", ctrl.myTables);

module.exports = router;
