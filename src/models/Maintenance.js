const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    maintenanceType: {
        type: String,
        required: true,
        enum: ['Regular Service', 'Engine & Mechanical', 'Tyres & Wheels', 'Brake System', 'Electrical & Battery', 'AC & Cooling', 'Body & Interior', 'Other']
    },
    category: {
        type: String, // Sub-category like 'Engine oil change', 'New tyre purchase' etc.
    },
    partsChanged: [String],
    description: String,
    garageName: String,
    billNumber: String,
    billDate: {
        type: Date,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Other'],
        default: 'Cash'
    },
    currentKm: Number,
    nextServiceKm: Number,
    nextServiceDate: Date,
    billPhoto: String, // Cloudinary URL
    status: {
        type: String,
        enum: ['Completed', 'Pending', 'Scheduled'],
        default: 'Completed'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for faster monthly analytics
maintenanceSchema.index({ company: 1, billDate: 1 });
maintenanceSchema.index({ vehicle: 1, billDate: 1 });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
