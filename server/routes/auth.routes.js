const express = require("express");
const router = express.Router();

const authControllers = require("../controllers/auth.controller");
const {
  validateRegister,
  checkEmailRegister,
  checkEmailLogin,
} = require("../middlewares/auth.middlewares");

router.post(
  "/register",
  checkEmailRegister,
  validateRegister,
  authControllers.register
);

router.post("/login",
  checkEmailLogin,
  validateRegister,
  authControllers.login
);

module.exports = router;
