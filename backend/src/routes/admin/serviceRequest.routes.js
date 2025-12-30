const router = require("express").Router();
const controller = require("../../controllers/admin/serviceRequest.controller");

// Protect these if you want
const authAdmin = require("../../middleware/authAdmin");

router.get("/", authAdmin, controller.listRequests);
router.patch("/:id/ack", authAdmin, controller.ackRequest);
router.patch("/:id/close", authAdmin, controller.closeRequest);

module.exports = router;
