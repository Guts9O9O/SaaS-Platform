const express = require("express");
const router = express.Router();
const { getMenuContext } = require("../controllers/menuContextController");

router.get("/context", getMenuContext);

module.exports = router;
