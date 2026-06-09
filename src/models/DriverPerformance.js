const mongoose = require('mongoose');

const driverPerformanceSchema = new mongoose.Schema({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    incidentType: {
        type: String,
        enum: ['Late for Duty', 'Missed Duty', 'No Uniform', 'Misbehavior', 'Vehicle Damage', 'Other'],
        required: true
    },
    remarks: {
        type: String,
        required: true
    },
    photos: {
        type: [String],
        default: []
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index to quickly fetch a driver's performance records
driverPerformanceSchema.index({ driverId: 1, date: -1 });

module.exports = mongoose.model('DriverPerformance', driverPerformanceSchema);
