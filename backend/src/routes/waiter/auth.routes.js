const router = require("express").Router();
const ctrl = require("../../controllers/waiter/auth.controller");

router.post("/login", ctrl.login);

module.exports = router;
