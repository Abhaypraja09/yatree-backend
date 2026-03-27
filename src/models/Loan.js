const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    monthlyEMI: {
        type: Number,
        required: true
    },
    tenureMonths: {
        type: Number,
        required: true
    },
    remainingAmount: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Active', 'Completed', 'Paused'],
        default: 'Active'
    },
    repayments: [{
        month: Number,
        year: Number,
        amount: Number,
        paidAt: { type: Date, default: Date.now }
    }],
    remarks: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

loanSchema.index({ company: 1, status: 1 });
loanSchema.index({ driver: 1 });

module.exports = mongoose.model('Loan', loanSchema);
