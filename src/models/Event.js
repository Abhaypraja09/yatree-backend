const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    client: {
        type: String // e.g., Relaince, Wedding Party
    },
    date: {
        type: Date,
        required: true
    },
    location: {
        type: String
    },
    description: {
        type: String
    },
    status: {
        type: String,
        enum: ['Active', 'Completed'],
        default: 'Active'
    },
    // We will link duties (Vehicles where isOutsideCar: true) to this event
    totalAmount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Index for faster queries
eventSchema.index({ company: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);
