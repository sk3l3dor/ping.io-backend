const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const isAuth = require("../../authentication/is-auth");
const userController = require("../../controllers/user");


router.post(
    "/register-token",
    [
      body("name").not().isEmpty(),
      body("password").not().isEmpty(),
      body("phone_number").not().isEmpty(),
      body("role").not().isEmpty(),
    ],
    userController.registerUserWithoutToken 
  );

  router.post(
    "/login-via-otp",
    [
        body("phone_number").not().isEmpty(),
    ],
    userController.loginUsingOtp
  );

  router.post(
    "/validate-otp-for-login",
    [
      body("user_id").trim().not().isEmpty(),
      body("otp").trim().not().isEmpty().isInt().isLength({ min: 6, max: 6 }),
    ],
    userController.validateOtpToLogin
  );