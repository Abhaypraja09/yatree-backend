const mongoose = require('mongoose');

const advanceSchema = new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    remark: {
        type: String,
        default: 'Advance Payment'
    },
    status: {
        type: String,
        enum: ['Pending', 'Recovered', 'Partially Recovered'],
        default: 'Pending'
    },
    recoveredAmount: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    advanceType: {
        type: String,
        enum: ['Office', 'Staff', 'Other'],
        default: 'Office'
    },
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    month: {
        type: Number
    },
    year: {
        type: Number
    },
    isStaffAdvance: {
        type: Boolean,
        default: false
    },
    givenBy: {
        type: String,
        default: 'Office'
    }
}, { timestamps: true });

// Indexes for faster recovery and dashboard queries
advanceSchema.index({ company: 1, status: 1 });
advanceSchema.index({ driver: 1, status: 1 });
advanceSchema.index({ staff: 1, status: 1 });
advanceSchema.index({ date: -1 });
advanceSchema.index({ month: 1, year: 1 });

module.exports = mongoose.model('Advance', advanceSchema);
