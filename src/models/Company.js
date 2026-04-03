const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        default: 'active'
    },
    vehicleLimit: {
        type: Number,
        default: 10
    },
    website: {
        type: String,
        default: 'www.yatreedestination.com'
    },
    ownerName: {
        type: String,
        default: 'KAVISH JAIN'
    },
    logoUrl: {
        type: String,
        default: '/logos/yatree_logo.png'
    },
    ownerSignatureUrl: {
        type: String,
        default: '/logos/kavish_sign.png'
    }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
