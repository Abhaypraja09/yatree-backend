const mongoose = require('mongoose');
const Maintenance = require('./src/models/Maintenance');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const coId = new mongoose.Types.ObjectId('69caf340162fc71dc07307d1');
    const mInMarch = await Maintenance.countDocuments({ company: coId, status: 'Completed', billDate: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-31') } });
    console.log('--- DEFINITIVE MARCH MAINTENANCE ---');
    console.log('MARCH_MAINT_COUNT:', mInMarch);
    await mongoose.disconnect();
}
check();
