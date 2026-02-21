const router = require("express").Router();
const authAdmin = require("../../middleware/authAdmin");
const {
  createWaiter,
  listWaiters,
  updateWaiter,
  deleteWaiter,
} = require("../../controllers/admin/staff.controller");

router.use(authAdmin);

router.get("/waiters", listWaiters);
router.post("/waiters", createWaiter);
router.put("/waiters/:id", updateWaiter);     // ✅ NEW: edit waiter
router.delete("/waiters/:id", deleteWaiter);  // ✅ NEW: delete waiter

module.exports = router;