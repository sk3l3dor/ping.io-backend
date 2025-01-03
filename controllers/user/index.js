require("dotenv").config();

const STATUS = require("../../utils/statusCodes");
const MESSAGE = require("../../utils/messages");
const FUNCTION = require("../../utils/functions");

const User = require("../../models/User");

const { validationResult } = require("express-validator");

const { sendLoginValidationSMS } = require("../../utils/functions");
const { sendForgotPasswordEmail } = require("../../utils/sendEmail");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const validations = require("../../utils/validations");

const JWT_SECRET = process.env.PNG_V1_JWT_SECRET;
const TOKEN_VALIDITY = process.env.PNG_V1_TOKEN_VALIDITY;
const TOKEN_MAX_VALIDITY = process.env.PNG_V1_TOKEN_MAX_VALIDITY;


module.exports.signup = async (req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Bad request', errors: errors.array() });
  }

  const { name, email, phone_number, password } = req.body;

  try {
      const existingUser  = await User.findOne({ email });
      if (existingUser ) {
          return res.status(409).json({ message: 'User  already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser  = new User({ name, email, phone_number, password: hashedPassword });
      await newUser .save();

      const token = jwt.sign({ id: newUser ._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      return res.status(201).json({ message: 'User  created successfully', token });
  } catch (error) {
      return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports.registerUserWithoutToken = async (req, res) => {
    const errors = validationResult(req);
  
    if (!errors.isEmpty()) {
      return res.status(STATUS.VALIDATION_FAILED).json({
        message: `Bad request`,
      });
    }
  
    const { name, password, phone_number, role } = req.body;
  
    const isNameValid = await validations.validateName(name);
    const isPasswordValid = await validations.validatePassword(password);
    const isPhoneNumberValid = await validations.validatePhoneNumber(
      phone_number
    );
  
    if (
        isNameValid.status === false ||
      isPasswordValid.status === false ||
      isPhoneNumberValid.status === false
    ) {
      const inputs_errors = [];
  
      if (isNameValid.status === false) {
        inputs_errors.push("NAME");
      }
  
      if (isPasswordValid.status === false) {
        inputs_errors.push("PASSWORD");
      }
  
      if (isPhoneNumberValid.status === false) {
        inputs_errors.push("PHONE_NUMBER");
      }
  
      return res.status(STATUS.VALIDATION_FAILED).json({
        message: "Invalid Inputs",
        fields: inputs_errors,
      });
    }
  
    const hashedPassword = await bcrypt.hash(password, 12);
  
    let user = new User({
      name: name.toLowerCase().replaceAll(/\s/g, ""),
      password: hashedPassword,
        phone_number: phone_number,
      role: role,
    });
  
    try {
      const savedUser = await user.save();
  
      return res.status(STATUS.CREATED).json({
        message: "User Created Successfully",
        data: savedUser.id,
      });
    } catch (error) {
      //console.log(error);
      return res.status(STATUS.BAD_REQUEST).json({
        message: MESSAGE.badRequest,
        error,
      });
    }
  };

module.exports.loginUsingOtp = async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(STATUS.BAD_REQUEST).json({
                message: "Validation failed",
                errors: errors.array(),
            });
        }
  
        const { phone_number } = req.body;
  
        // Find user by PH NO
        const user = await User.findOne({ "phone": phone_number });
        if (!user) {
            return res.status(STATUS.NOT_FOUND).json({
                message: "User not found",
            });
        }
  
        // Generate OTP and update user
        const OTP = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
        const timestamp = new Date();
  
        user.login_data.otp = OTP;
        user.login_data.timestamp = timestamp;
  
        const savedUser = await user.save();
        if (!savedUser) {
            return res.status(STATUS.INTERNAL_SERVER_ERROR).json({
                message: "Failed to save user details",
            });
        }
  
        // Send OTP via SMS
        const sendPhoneOTP = await sendLoginValidationSMS(
            user.name,
            user.phone_number,
            OTP
        );
  
        if (!sendPhoneOTP) {
            return res.status(STATUS.INTERNAL_SERVER_ERROR).json({
                message: "Failed to send OTP",
            });
        }
  
        // Generate tokens
        // const accessToken = jwt.sign(
        //     {
        //         uid: savedUser.id,
        //         type: "OWNER",
        //         role: savedUser.role,
        //     },
        //     JWT_SECRET,
        //     { expiresIn: TOKEN_VALIDITY }
        // );
  
        // const refreshToken = jwt.sign(
        //     {
        //         uid: savedUser.id,
        //         type: "OWNER",
        //         role: savedUser.role,
        //     },
        //     JWT_SECRET,
        //     { expiresIn: TOKEN_MAX_VALIDITY }
        // );
  
        // Respond with success
        return res.status(STATUS.SUCCESS).json({
            message: "OTP sent to Registered Mobile Number ",
            data: savedUser.id
        });
    } catch (error) {
        console.error("Error in loginUsingOtp:", error);
        return res.status(STATUS.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
            error: error.message,
        });
    }
  };

module.exports.validateOtpToLogin = async (req,res) => {
    const errors = validationResult(req);
  
    if (!errors.isEmpty()) {
      return res.status(STATUS.BAD_REQUEST).json({
        message: `Bad request`,
      });
    }
    const user_id = req.body.user_id;
    try {
      let user = await User.findOne({ _id: user_id});
  
          if(!user){
              return res.status(STATUS.NOT_FOUND).json({
                  message: "User not found",
              });
          }else{
            if(user.login_data.otp === parseInt(req.body.otp)){
              let accessToken = await jwt.sign({
                uid: user.id,
                type: "OWNER",
                role: user.role,
            }, JWT_SECRET, {expiresIn: TOKEN_VALIDITY});
  
            let refreshToken = await jwt.sign({
                uid: user.id,
                type: "OWNER",
                role: user.role,
            }, JWT_SECRET, {expiresIn: TOKEN_MAX_VALIDITY});
  
            let response_data = {
                access_token: accessToken,
                refresh_token: refreshToken,
                user_id: user.id,
                name: `${user.name}`,
                phone_number: user.phone_number
                }
                return res.status(STATUS.SUCCESS).json({
                  message: "Login Successfull",
                  data: response_data
              });
            }else{
              return res.status(STATUS.VALIDATION_FAILED).json({
                message: "OTP is Incorrect",
            });
            }
          }
    } catch (error) {
      return res.status(STATUS.BAD_REQUEST).json({
              message: MESSAGE.badRequest,
              error
          });
    }
  
  };


  module.exports.signupNewUser  = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(STATUS.BAD_REQUEST).json({
            message: `Bad request`,
            errors: errors.array(),
        });
    }

    const { name, email, phone_number, password } = req.body;

    try {
        // Check if user already exists
        const existingUser  = await User.findOne({ email });
        if (existingUser ) {
            return res.status(STATUS.CONFLICT).json({
                message: 'User  already exists',
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser  = new User({
            name,
            email,
            phone_number,
            password: hashedPassword,
        });

        await newUser .save();

        // Generate a token (optional)
        const token = jwt.sign({ id: newUser ._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        return res.status(STATUS.CREATED).json({
            message: 'User  created successfully',
            token,
        });
    } catch (error) {
        return res.status(STATUS.INTERNAL_SERVER_ERROR).json({
            message: 'Server error',
            error: error.message,
        });
    }
};