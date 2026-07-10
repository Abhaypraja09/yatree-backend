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
    // Tariff / Rate Cards defined for this specific event
    rateCard: [{
        serviceName: { type: String, required: true }, // e.g. Airport Drop, Udaipur Tour
        vehicleType: { type: String }, // Optional: Sedan, SUV, Bus
        vehicleModel: { type: String }, // Optional: Innova, Dzire
        baseRate: { type: Number, required: true, default: 0 },
        baseKms: { type: Number, default: 0 },
        baseHours: { type: Number, default: 0 },
        extraKmRate: { type: Number, default: 0 },
        extraHourRate: { type: Number, default: 0 },
        driverAllowance: { type: Number, default: 0 }
    }],
    // Financial Tracking
    proformaAmount: {
        type: Number,
        default: 0
    },
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
    },
    customVehicles: {
        type: Map,
        of: [String],
        default: {}
    }
}, { timestamps: true });

// Index for faster queries
eventSchema.index({ company: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);
