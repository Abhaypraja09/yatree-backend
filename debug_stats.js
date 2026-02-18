
const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const dotenv = require('dotenv');
dotenv.config();

const Attendance = require('./src/models/Attendance');
const Advance = require('./src/models/Advance');
const User = require('./src/models/User');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');

    const companyId = '679905fa8dbe003cce0403cd'; // Assuming this is the company ID from common context or I can find it
    // Let me find a company first
    const company = await mongoose.connection.db.collection('companies').findOne({});
    const realCompanyId = company._id.toString();
    console.log('Using Company ID:', realCompanyId);

    const targetDate = '2026-02-17';
    const baseDate = DateTime.fromFormat(targetDate, 'yyyy-MM-dd').setZone('Asia/Kolkata').startOf('day');

    const attCount = await Attendance.countDocuments({ company: realCompanyId, date: targetDate });
    console.log('Attendance count for today:', attCount);

    const advCount = await Advance.countDocuments({
        company: realCompanyId,
        date: {
            $gte: baseDate.toJSDate(),
            $lte: baseDate.endOf('day').toJSDate()
        }
    });
    console.log('Advances count for today:', advCount);

    process.exit(0);
}

check();
