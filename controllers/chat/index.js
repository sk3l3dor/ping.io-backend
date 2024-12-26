require("dotenv").config();

const STATUS = require("../../utils/statusCodes");
const MESSAGE = require("../../utils/messages");
const FUNCTION = require("../../utils/functions");

const User = require("../../models/User");
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

module.exports.newChat = async (req, res) => {
    const { participants, name, isGroupChat } = req.body;

    // Validate participants
    if (!participants || participants.length < 2) {
        return res.status(400).json({ message: 'At least two participants are required.' });
    }

    try {
        const newChat = new Chat({
            participants,
            name: isGroupChat ? name : null,
            isGroupChat: isGroupChat || false,
        });

        const savedChat = await newChat.save();

        // Emit an event to notify participants about the new chat
        participants.forEach(participant => {
            req.io.to(participant).emit('newChat', savedChat);
        });

        res.status(201).json(savedChat);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports.getAllChatsForUser = async (req,res) => {
    const { id } = req.params;

    try {
        // Find chats where the user is a participant
        const chats = await Chat.find({ participants: id })
            .populate('participants', 'name profilePicture') // Populate participant details
            .populate('messages') // Optionally populate messages if needed
            .sort({ updatedAt: -1 }); // Sort by the most recent chat

        // Check if chats were found
        if (!chats || chats.length === 0) {
            return res.status(404).json({ message: 'No chats found for this user.' });
        }

        // Return the found chats
        res.status(200).json(chats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports.getChatById = async (req,res) => {
    const { chatId } = req.params;

    try {
        // Find the chat by ID and populate participants and messages
        const chat = await Chat.findById(chatId)
            .populate('participants', 'name profilePicture') // Populate participant details
            .populate('messages') // Optionally populate messages if needed

        // Check if the chat was found
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found.' });
        }

        // Return the found chat
        res.status(200).json(chat);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}


module.exports.updateChatInformation = async (req, res) => {
    const { chatId } = req.params;
    const { chatName, chatType } = req.body;

    try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found.' });
        }

        if (chatName) {
            chat.name = chatName;
        }
        if (chatType !== undefined) {
            chat.isGroupChat = chatType === 'group';
        }

        const updatedChat = await chat.save();

        // Emit an event to notify participants about the chat update
        chat.participants.forEach(participant => {
            req.io.to(participant).emit('chatUpdated', updatedChat);
        });

        res.status(200).json(updatedChat);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports.deleteChat = async (req, res) => {
    const { chatId } = req.params;

    try {
        const chat = await Chat.findByIdAndDelete(chatId);

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found.' });
        }

        // Emit an event to notify participants about the chat deletion
        chat.participants.forEach(participant => {
            req.io.to(participant).emit('chatDeleted', chatId);
        });

        res.status(200).json({ message: 'Chat deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};