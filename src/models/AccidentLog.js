const mongoose = require('mongoose');

const accidentLogSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
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
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    amount: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        required: true
    },
    location: String,
    photos: [String], // Cloudinary URLs
    status: {
        type: String,
        enum: ['Pending', 'Repaired', 'Insurance Claimed', 'Closed'],
        default: 'Pending'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
accidentLogSchema.index({ company: 1, date: -1 });
accidentLogSchema.index({ vehicle: 1, date: -1 });
accidentLogSchema.index({ driver: 1, date: -1 });

module.exports = mongoose.model('AccidentLog', accidentLogSchema);
