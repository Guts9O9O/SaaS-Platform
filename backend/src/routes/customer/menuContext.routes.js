const express = require("express");
const router = express.Router();
const { getMenuContext } = require("../../controllers/customer/menuContext.controller");

router.get("/context", getMenuContext);

module.exports = router;
