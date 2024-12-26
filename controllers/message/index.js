require("dotenv").config();

const STATUS = require("../../utils/statusCodes");
const MESSAGE = require("../../utils/messages");
const FUNCTION = require("../../utils/functions");

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


module.exports.sendMessage = async (req, res) => {
    const { chatId, senderId, text, media } = req.body;

    try {
        // Validate input
        if (!chatId || !senderId || !text) {
            return res.status(400).json({ message: 'Chat ID, sender ID, and text are required.' });
        }

        // Create a new message
        const newMessage = new Message({
            chat: chatId,
            sender: senderId,
            receiver: null, // Set receiver to null for group chats or handle accordingly
            content: text,
            media: media || null, // Optional media field
        });

        // Save the message to the database
        const savedMessage = await newMessage.save();

        // Update the chat with the latest message reference
        await Chat.findByIdAndUpdate(chatId, { $push: { messages: savedMessage._id } });

        // Emit the new message to the chat participants
        req.io.to(chatId).emit('newMessage', savedMessage); // Notify all participants in the chat

        // Return the saved message
        res.status(201).json(savedMessage);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports.getMessagesInChat = async (req,res) => {
    const { chatId } = req.params;

    try {
        // Find messages associated with the chat ID
        const messages = await Message.find({ chat: chatId })
            .populate('sender', 'name profilePicture') // Populate sender details
            .sort({ timestamp: 1 }); // Sort messages by timestamp in ascending order

        // Check if messages were found
        if (!messages || messages.length === 0) {
            return res.status(404).json({ message: 'No messages found for this chat.' });
        }

        // Return the found messages
        res.status(200).json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports.getUnreadMessages = async (req,res) => {
    const { userId } = req.params;

    try {
        // Find unread messages for the user
        const unreadMessages = await Message.find({ recipient: userId, read: false })
            .populate('sender', 'name profilePicture') // Populate sender details
            .sort({ timestamp: 1 }); // Sort by timestamp

        // Check if unread messages were found
        if (!unreadMessages || unreadMessages.length === 0) {
            return res.status(404).json({ message: 'No unread messages found.' });
        }

        // Return the found unread messages
        res.status(200).json(unreadMessages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports.deleteMessage = async (req, res) => {
    const { messageId } = req.params;

    try {
        // Find and delete the message
        const deletedMessage = await Message.findByIdAndDelete(messageId);

        // Check if the message was found and deleted
        if (!deletedMessage) {
            return res.status(404).json({ message: 'Message not found.' });
        }

        // Emit the message deletion to the chat participants
        req.io.to(deletedMessage.chat).emit('messageDeleted', messageId); // Notify participants about the deletion

        // Return a success message
        res.status(200).json({ message: 'Message deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports.markMessagesAsRead = async (req, res) => {
    const { userId } = req.params;

    try {
        // Update messages to mark them as read
        const updatedMessages = await Message.updateMany(
            { recipient: userId, read: false },
            { $set: { read: true } }
        );

        // Check if any messages were updated
        if (updatedMessages.nModified === 0) {
            return res.status(404).json({ message: 'No unread messages to mark as read.' });
        }

        // Emit an event to notify the sender(s) that their messages have been read
        req.io.to(userId).emit('messagesRead', { userId }); // Notify the sender

        // Return a success message
        res.status(200).json({ message: 'Messages marked as read successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

