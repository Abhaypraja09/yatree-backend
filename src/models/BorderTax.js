const mongoose = require('mongoose');

const borderTaxSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    borderName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    receiptPhoto: {
        type: String // URL to uploaded image
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    remarks: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('BorderTax', borderTaxSchema);
