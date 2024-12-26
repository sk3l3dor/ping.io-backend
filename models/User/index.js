const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        profilePicture: {
            type: String,
            required: false
        },
        status: {
            type: String,
            default: 'Hey There! I\'m using Ping.io'
        },
        password: {
            type: String,
            required: true
        },
        lastSeen: {
            type: Date,
            default: Date.now
        },
        contacts: [
            {
                type: ObjectId,
                ref: "User ",
                required: false,
            }
        ],
        isOnline: {
            type: Boolean,
            default: false,
        },
        login_data: {
            otp: {
                type: Number,
                default: 0
            },
            timestamp: {
                type: Date,
                required: false
            }
        },
        role: {
            type: String,
            enum: ['USER', 'ADMIN'], // Define roles here
            default: 'USER' // Default role
        },
    },
    {
        timestamps: true
    }
);

userSchema.set("toJSON", {
    transform: (doc, ret, options) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

module.exports = mongoose.model('User ', userSchema);