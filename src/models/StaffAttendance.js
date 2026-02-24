const mongoose = require('mongoose');

const staffAttendanceSchema = new mongoose.Schema({
    staff: {
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
        type: String, // format: YYYY-MM-DD
        required: true
    },
    punchIn: {
        time: { type: Date },
        location: {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String }
        },
        photo: { type: String }
    },
    punchOut: {
        time: { type: Date },
        location: {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String }
        },
        photo: { type: String }
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'half-day'],
        default: 'present'
    }
}, { timestamps: true });

// Ensure one attendance record per staff per day
staffAttendanceSchema.index({ staff: 1, date: 1 }, { unique: true });
staffAttendanceSchema.index({ company: 1, date: 1 });

module.exports = mongoose.model('StaffAttendance', staffAttendanceSchema);
