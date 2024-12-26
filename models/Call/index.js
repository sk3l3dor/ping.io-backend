const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const callSchema = new Schema({
    caller: { 
        type: ObjectId, 
        ref: 'User ', // Reference to the User model
        required: true 
    },
    receiver: { 
        type: ObjectId, 
        ref: 'User ', // Reference to the User model
        required: true 
    },
    callType: { 
        type: String, 
        enum: ['voice', 'video'], // Specify the type of call
        required: true 
    },
    status: { 
        type: String, 
        enum: ['ongoing', 'ended'], // Status of the call
        default: 'ongoing' 
    },
    startTime: { 
        type: Date, 
        default: Date.now 
    },
    endTime: { 
        type: Date, 
        required: false // Optional, only set when the call ends
    },
    duration: { 
        type: Number, // Duration in seconds
        required: false // Optional, can be calculated when the call ends
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Call', callSchema);