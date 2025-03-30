const express = require("express");
const router = express.Router();

const userControllers = require("../controllers/user.controller");
const { authenticate } = require("../middlewares/auth.middlewares");

router.get("/test", authenticate, userControllers.getUser);
module.exports = router;
