const router = require("express").Router();
const controller = require("../../controllers/customer/serviceRequest.controller");

// If you want to force only logged-in customers, uncomment:
// const customerSession = require("../../middleware/customerSession");
// router.post("/bill", customerSession, controller.requestBill);

router.post("/bill", controller.requestBill);

module.exports = router;
