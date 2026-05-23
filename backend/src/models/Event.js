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
        enum: ['Upcoming', 'Running', 'Closed'],
        default: 'Upcoming'
    },
    // Financial Tracking
    totalRevenue: {
        type: Number,
        default: 0
    },
    amountReceived: {
        type: Number,
        default: 0
    },
    advanceAmount: {
        type: Number,
        default: 0
    },
    totalExpense: { // What we pay to external cars / drivers
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Index for faster queries
eventSchema.index({ company: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);
