const mongoose = require('mongoose');

const staffSalaryPaymentSchema = new mongoose.Schema({
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['paid', 'pending'], default: 'paid' },
    paymentMethod: { type: String, default: 'Cash' }
}, { timestamps: true });

staffSalaryPaymentSchema.index({ staff: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('StaffSalaryPayment', staffSalaryPaymentSchema);
