const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const messageSchema = new Schema(
    {
        chat: { 
            type: ObjectId, 
            ref: 'Chat', // Reference to the Chat model
            required: true 
        },
        sender: { 
            type: ObjectId, 
            ref: 'User ', // Removed extra space
            required: true 
        },
        receiver: { 
            type: ObjectId,
            ref: 'User ', // Removed extra space
            required: true
        },
        content: { 
            type: String,
            required: true
        },
        media: { 
            type: String, // URL or path to the media file
            required: false 
        },
        timestamp: { 
            type: Date,
            default: Date.now 
        },
        isRead: { 
            type: Boolean,
            default: false 
        }
    },
    {
        timestamps: true // Automatically adds createdAt and updatedAt fields
    }
);

module.exports = mongoose.model('Message', messageSchema);