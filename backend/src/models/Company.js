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
        default: 'www.fleetmanagement.com'
    },
    ownerName: {
        type: String,
        default: 'AUTHORIZED MANAGER'
    },
    logoUrl: {
        type: String,
        default: '/logos/logo.png'
    },
    ownerSignatureUrl: {
        type: String,
        default: '/logos/signature.png'
    },
    whatsappNumber: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
