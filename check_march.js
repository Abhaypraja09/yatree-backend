const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const Fuel = require('./src/models/Fuel');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const coId = new mongoose.Types.ObjectId('69caf340162fc71dc07307d1');
    const mStart = '2026-03-01';
    const mEnd = '2026-03-31';
    
    const fuel = await Fuel.countDocuments({ company: coId, date: { $gte: new Date(mStart), $lte: new Date(mEnd) } });
    const att = await Attendance.countDocuments({ company: coId, date: { $gte: mStart, $lte: mEnd } });
    
    console.log('MARCH_STATS_START');
    console.log('Fuel entries in March:', fuel);
    console.log('Attendance entries in March:', att);
    console.log('MARCH_STATS_END');
    
    await mongoose.disconnect();
}
check();
