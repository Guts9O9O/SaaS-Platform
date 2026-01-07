const router = require("express").Router();
const controller = require("../../controllers/customer/serviceRequest.controller");
const customerSession = require("../../middleware/customerSession");

// Existing bill route (keep)
router.post("/bill", customerSession, controller.requestBill);

// ✅ Generic route (this was crashing before)
router.post("/", customerSession, controller.createServiceRequest);

module.exports = router;