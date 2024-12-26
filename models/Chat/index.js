const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const chatSchema = new Schema(
    {
        participants: [
            {
                type: ObjectId,
                ref: "User ",
                required: true,
            }
        ],
        messages: [
            {
                type: ObjectId,
                ref: "Message",
                required: false, // Messages can be added later, so this can be optional
            }
        ],
        name: {
            type: String,
            required: false, // Optional for private chats
        },
        isGroupChat: {
            type: Boolean,
            default: false, // Indicates if the chat is a group chat
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt fields
    }
);

// Transform the output of the chat object
chatSchema.set("toJSON", {
    transform: (doc, ret, options) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

module.exports = mongoose.model('Chat', chatSchema);