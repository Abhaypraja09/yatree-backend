const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const coId = new mongoose.Types.ObjectId('69caf340162fc71dc07307d1');
    const c = await Attendance.countDocuments({ company: coId, date: { $gte: '2026-03-01', $lte: '2026-03-31' } });
    console.log('--- MARCH ATTENDANCE ---');
    console.log('ATT_COUNT:', c);
    await mongoose.disconnect();
}
check();
