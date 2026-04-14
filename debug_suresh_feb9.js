const mongoose = require('mongoose');
const User = require('./src/models/User');
const Attendance = require('./src/models/Attendance');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ name: /Suresh Patel/i });
    if (!user) {
        console.log('User not found');
        process.exit();
    }
    console.log('User ID:', user._id);

    const att = await Attendance.findOne({
        driver: user._id,
        date: '2026-02-09'
    });

    if (att) {
        console.log('Attendance for 2026-02-09:');
        console.log('parking field:', att.parking);
        console.log('punchOut.tollParkingAmount:', att.punchOut?.tollParkingAmount);
    } else {
        console.log('Attendance not found for 2026-02-09');
    }

    process.exit();
}

check();
