const mongoose = require('mongoose');

const fuelSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    fuelType: {
        type: String,
        enum: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Other'],
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number, // In Liters or KG
        required: true
    },
    rate: {
        type: Number, // Price per liter
        required: true
    },
    odometer: {
        type: Number,
        required: true
    },
    stationName: {
        type: String
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'FASTag', 'Other', 'Yatree Office', 'Guest / Client'],
        default: 'Cash'
    },
    paymentSource: {
        type: String,
        enum: ['Yatree Office', 'Guest / Client', 'Guest'],
        default: 'Yatree Office'
    },
    driver: {
        type: String, // Can store Name or Driver ID
        required: true
    },
    // Calculated Fields
    distance: {
        type: Number,
        default: 0
    },
    mileage: {
        type: Number,
        default: 0
    },
    costPerKm: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    source: {
        type: String,
        enum: ['Admin', 'Driver'],
        default: 'Admin'
    },
    slipPhoto: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes for faster monthly analytics
fuelSchema.index({ company: 1, date: 1 });
fuelSchema.index({ vehicle: 1, date: 1 });

module.exports = mongoose.model('Fuel', fuelSchema);
