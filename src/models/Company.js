const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['YatreeDestination', 'GoGetGo']
    },
    status: {
        type: String,
        default: 'active'
    }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
