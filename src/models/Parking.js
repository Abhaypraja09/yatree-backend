const mongoose = require('mongoose');

const parkingSchema = new mongoose.Schema({
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
    driver: {
        type: String, // Driver Name
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
    location: {
        type: String,
        default: 'Not Specified'
    },
    remark: {
        type: String
    },
    source: {
        type: String,
        enum: ['Admin', 'Driver'],
        default: 'Admin'
    },
    receiptPhoto: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for faster monthly analytics
parkingSchema.index({ company: 1, date: 1 });
parkingSchema.index({ vehicle: 1, date: 1 });

module.exports = mongoose.model('Parking', parkingSchema);
