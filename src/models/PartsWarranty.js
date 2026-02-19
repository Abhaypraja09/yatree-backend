const mongoose = require('mongoose');

const partsWarrantySchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    partName: {
        type: String,
        required: true
    },
    brandName: {
        type: String,
        required: true
    },
    invoiceNumber: {
        type: String,
        required: true
    },
    purchaseDate: {
        type: Date,
        required: true
    },
    warrantyStartDate: {
        type: Date,
        required: true
    },
    warrantyEndDate: {
        type: Date,
        required: true
    },
    warrantyPeriod: {
        type: String, // e.g., "12 months" or "2 years"
        required: true
    },
    supplierName: {
        type: String,
        required: true
    },
    cost: {
        type: Number,
        required: true
    },
    warrantyCardImage: {
        type: String // URL/Path to image
    },
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Claimed'],
        default: 'Active'
    },
    claimDetails: {
        claimDate: Date,
        claimStatus: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected']
        },
        replacementDate: Date,
        remarks: String
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }
}, {
    timestamps: true
});

// Virtual for checking if expired
partsWarrantySchema.virtual('isExpired').get(function () {
    return new Date() > this.warrantyEndDate;
});

module.exports = mongoose.model('PartsWarranty', partsWarrantySchema);
