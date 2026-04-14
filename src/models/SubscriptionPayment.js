const mongoose = require('mongoose');

const subscriptionPaymentSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: {
        type: String, // e.g. "March 2026"
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Paid', 'Pending', 'Failed'],
        default: 'Paid'
    },
    transactionRef: {
        type: String,
        unique: true
    },
    paymentMethod: {
        type: String,
        enum: ['Online', 'Cash', 'Bank Transfer'],
        default: 'Online'
    }
}, { timestamps: true });

// Index for faster history lookup
subscriptionPaymentSchema.index({ company: 1, month: -1 });

module.exports = mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);
