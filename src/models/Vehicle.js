const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    carNumber: {
        type: String,
        required: true,
        unique: true
    },
    model: {
        type: String,
        required: true
    },
    permitType: {
        type: String,
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    currentDriver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    carType: {
        type: String,
        enum: ['SUV', 'Sedan', 'Hatchback', 'Other'],
        default: 'SUV'
    },
    isOutsideCar: {
        type: Boolean,
        default: false
    },
    driverName: {
        type: String // For outside cars
    },
    dutyType: {
        type: String // For outside cars
    },
    ownerName: {
        type: String // For outside cars
    },
    dutyAmount: {
        type: Number,
        default: 0
    },
    property: {
        type: String // For outside cars: Client/Property name (e.g. Hotel Taj)
    },
    dropLocation: {
        type: String // For outside cars
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: false
    },
    fastagNumber: {
        type: String
    },
    fastagBank: {
        type: String // e.g., ICICI, Paytm
    },
    fastagBalance: {
        type: Number,
        default: 0
    },
    fastagHistory: [{
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        method: { type: String }, // e.g., ICICI Bank, UPI, etc.
        remarks: { type: String }
    }],
    documents: [{
        documentType: {
            type: String,
            enum: ['RC', 'PUC', 'FITNESS', 'PERMIT', 'INSURANCE'],
            required: true
        },
        imageUrl: {
            type: String,
            required: true
        },
        expiryDate: {
            type: Date,
            required: true
        }
    }],
    lastOdometer: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for faster dashboard queries
vehicleSchema.index({ company: 1 });
vehicleSchema.index({ isOutsideCar: 1 });

// Virtual for document statuses
vehicleSchema.virtual('documentStatuses').get(function () {
    if (!this.documents) return [];

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return this.documents.map(doc => {
        let status = 'Valid';
        if (doc.expiryDate < now) {
            status = 'Expired';
        } else if (doc.expiryDate <= thirtyDaysFromNow) {
            status = 'Expiring Soon';
        }
        return {
            documentType: doc.documentType,
            status
        };
    });
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
