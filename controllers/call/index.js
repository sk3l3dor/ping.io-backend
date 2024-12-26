require("dotenv").config();

const STATUS = require("../../utils/statusCodes");
const MESSAGE = require("../../utils/messages");
const FUNCTION = require("../../utils/functions");

const User = require("../../models/User");
const Call = require("../../models/Call");
const Message = require("../../models/Message");
const Chat = require("../../models/Chat");




const { validationResult } = require("express-validator");

const { sendLoginValidationSMS } = require("../../utils/functions");
const { sendForgotPasswordEmail } = require("../../utils/sendEmail");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const validations = require("../../utils/validations");

const JWT_SECRET = process.env.PNG_V1_JWT_SECRET;
const TOKEN_VALIDITY = process.env.PNG_V1_TOKEN_VALIDITY;
const TOKEN_MAX_VALIDITY = process.env.PNG_V1_TOKEN_MAX_VALIDITY;



module.exports.initiateCall = async (req,res) => {
    const { callerId, receiverId, callType } = req.body;

    try {
        // Create a new call record
        const newCall = new Call({
            caller: callerId,
            receiver: receiverId,
            callType: callType,
            status: 'ongoing', // Set initial status
            startTime: new Date(),
        });

        const savedCall = await newCall.save();

        // Emit an event to notify the receiver about the incoming call
        // Assuming you have a socket.io instance available
        req.io.to(receiverId).emit('incomingCall', savedCall);

        res.status(201).json(savedCall);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports.getCallHistory = async (req,res) => {
    const { userId } = req.params;

    try {
        const callHistory = await Call.find({
            $or: [{ caller: userId }, { receiver: userId }]
        })
        .populate('caller', 'name profilePicture') // Populate caller details
        .populate('receiver', 'name profilePicture') // Populate receiver details
        .sort({ startTime: -1 }); // Sort by most recent call

        res.status(200).json(callHistory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports.endCall = async(req,res) => {
    const { callId } = req.params;

    try {
        const call = await Call.findById(callId);

        if (!call) {
            return res.status(404).json({ message: 'Call not found.' });
        }

        // Update the call status to 'ended'
        call.status = 'ended';
        call.endTime = new Date(); // Set the end time
        await call.save();

        // Emit an event to notify participants that the call has ended
        req.io.to(call.receiver).emit('callEnded', call);
        req.io.to(call.caller).emit('callEnded', call);

        res.status(200).json({ message: 'Call ended successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}