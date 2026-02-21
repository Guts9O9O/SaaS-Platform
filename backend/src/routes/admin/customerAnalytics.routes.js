const router = require("express").Router();
const authAdmin = require("../../middleware/authAdmin");
const ctrl = require("../../controllers/admin/customerAnalytics.controller");

router.use(authAdmin);

// GET /api/admin/analytics/customers?days=7
router.get("/customers", ctrl.getCustomerAnalytics);

module.exports = router;
