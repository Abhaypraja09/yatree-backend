const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

require('./src/models/User');
require('./src/models/Vehicle');
require('./src/models/Attendance');
require('./src/models/Company');
require('./src/models/BorderTax');
require('./src/models/Maintenance');
require('./src/models/Fuel');
require('./src/models/Advance');
require('./src/models/Parking');
require('./src/models/StaffAttendance');
require('./src/models/AccidentLog');
require('./src/models/PartsWarranty');

async function debug() {
    await mongoose.connect(process.env.MONGODB_URI);
    const companyId = '6982e8b7d0b069a49db197b9';
    const targetDate = '2026-02-20';
    const baseDate = DateTime.fromFormat(targetDate, 'yyyy-MM-dd').setZone('Asia/Kolkata').startOf('day');
    const monthStartStr = baseDate.startOf('month').toFormat('yyyy-MM-dd');
    const monthEndStr = baseDate.endOf('month').toFormat('yyyy-MM-dd');
    const monthStart = baseDate.startOf('month').toJSDate();
    const monthEnd = baseDate.endOf('month').toJSDate();

    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    console.log('--- DB STATS DEBUG ---');
    console.log({ companyId, targetDate, monthStartStr, monthEndStr, monthStart, monthEnd });

    const attCount = await mongoose.model('Attendance').countDocuments({ company: companyObjectId });
    console.log('Total Attendance records for company:', attCount);

    const atts = await mongoose.model('Attendance').find({
        company: companyObjectId,
        date: { $gte: monthStartStr, $lte: monthEndStr }
    }).populate('driver');

    console.log('Attendance this month:', atts.length);

    const outside = await mongoose.model('Vehicle').find({
        company: companyObjectId,
        isOutsideCar: true,
        createdAt: { $gte: monthStart, $lte: monthEnd }
    });

    console.log('Outside cars this month:', outside.length);

    const outsideAll = await mongoose.model('Vehicle').find({
        company: companyObjectId,
        isOutsideCar: true
    });
    console.log('Total Outside cars (no date filter):', outsideAll.length);
    if (outsideAll.length > 0) {
        console.log('Example outside car createdAt:', outsideAll[0].createdAt);
    }

    if (atts.length > 0) {
        console.log('First att driver name:', atts[0].driver?.name);
        console.log('First att driver isFreelancer:', atts[0].driver?.isFreelancer);
    }

    process.exit();
}

debug().catch(err => {
    console.error(err);
    process.exit(1);
});
