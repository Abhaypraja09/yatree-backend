const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    date: {
        type: String, // format: YYYY-MM-DD for easier querying per day
        required: true
    },
    punchIn: {
        km: { type: Number },
        selfie: { type: String }, // URL from Cloudinary
        kmPhoto: { type: String }, // URL from Cloudinary
        carSelfie: { type: String }, // NEW
        time: { type: Date },
        location: {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String }
        }
    },
    punchOut: {
        km: { type: Number },
        selfie: { type: String },
        kmPhoto: { type: String },
        carSelfie: { type: String },
        time: { type: Date },
        location: {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String }
        },
        remarks: { type: String }, // This will be "Duty"
        tollParkingAmount: { type: Number, default: 0 },
        allowanceTA: { type: Number, default: 0 }, // 100 bonus
        nightStayAmount: { type: Number, default: 0 }, // 500 bonus
        otherRemarks: { type: String } // Puncture etc.
    },

    // Legacy / Structured Fields (Required for detailed tracking and images)
    fuel: {
        filled: { type: Boolean, default: false },
        amount: { type: Number, default: 0 }, // Total sum of all entries
        entries: [{
            amount: { type: Number },
            km: { type: Number },
            slipPhoto: { type: String }
        }],
        km: { type: Number }, // Legacy/Single entry fallback
        slipPhoto: { type: String } // Legacy/Single entry fallback
    },
    parking: [{
        amount: { type: Number },
        slipPhoto: { type: String }
    }],
    outsideTrip: {
        occurred: { type: Boolean, default: false },
        tripType: { type: String },
        bonusAmount: { type: Number, default: 0 }
    },
    attendanceStatus: { type: String }, // Legacy field, avoiding delete
    totalKM: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['incomplete', 'completed'],
        default: 'incomplete'
    },
    dailyWage: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Index for faster querying
attendanceSchema.index({ driver: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
