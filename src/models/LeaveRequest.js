const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    startDate: {
        type: String, // format: YYYY-MM-DD
        required: true
    },
    endDate: {
        type: String, // format: YYYY-MM-DD
        required: true
    },
    reason: {
        type: String
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    type: {
        type: String,
        enum: ['Sick Leave', 'Casual Leave', 'Personal', 'Emergency', 'Full Day', 'Half Day'],
        default: 'Sick Leave'
    },
    appliedAt: {
        type: Date,
        default: Date.now
    },
    approvedAt: {
        type: Date
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
