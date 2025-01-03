const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const passport = require('passport');
const authController = require("../../controllers/auth"); // Adjust the path as necessary
const userController = require("../../controllers/user")

// Route for user signup
router.post(
    "/sign-up",
    [
        body("name").trim().not().isEmpty(),
        body("email").trim().isEmail(),
        body("phone_number").trim().not().isEmpty(),
        body("password").not().isEmpty(),
    ],
    userController.signup 
);

// Route for logging in via OTP
router.post(
    "/login-via-otp",
    [
        body("phone_number").trim().not().isEmpty().withMessage("Phone number is required"),
    ],
    userController.loginUsingOtp // Implement this in your controller
);

// Route for validating OTP for login
router.post(
    "/validate-otp-for-login",
    [
        body("user_id").trim().not().isEmpty().withMessage("User  ID is required"),
        body("otp").trim().isInt().isLength({ min: 6, max: 6 }).withMessage("OTP must be a 6-digit number"),
    ],
    userController.validateOtpToLogin // Implement this in your controller
);

module.exports = router;