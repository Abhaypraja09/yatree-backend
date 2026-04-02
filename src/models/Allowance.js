const mongoose = require('mongoose');

const allowanceSchema = new mongoose.Schema({
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
        default: 'Special Allowance'
    },
    type: {
        type: String,
        enum: ['Office Work', 'Wedding', 'Bonus', 'Other'],
        default: 'Other'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

allowanceSchema.index({ company: 1, date: -1 });
allowanceSchema.index({ driver: 1, date: -1 });

module.exports = mongoose.model('Allowance', allowanceSchema);
