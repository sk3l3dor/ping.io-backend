require("dotenv").config();
const jwt = require("jsonwebtoken");
const STATUS = require("../utils/statusCodes");
const MESSAGE = require("../utils/messages");

const JWT_SECRET = process.env.JWT_SECRET; // Ensure this is set in your .env file

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(STATUS.UNAUTHORISED).json({ message: "Please provide a valid token" });
    }

    const token = authHeader.split(' ')[1]; // Extract the token from the header

    jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
        if (err) {
            return res.status(STATUS.UNAUTHORISED).json({ message: "Your token is not valid or has expired" });
        }

        req.userId = decodedToken.id; // Attach user ID to the request object
        next(); // Proceed to the next middleware or route handler
    });
};