const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

require('./src/models/User');
require('./src/models/Vehicle');
const Attendance = require('./src/models/Attendance');

async function checkDuties() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const records = await Attendance.find({
            date: '2026-03-05'
        }).populate('driver').populate('vehicle');

        console.log(`Found ${records.length} records for 2026-03-05:`);
        records.forEach(r => {
            console.log(`ID: ${r._id}, Driver: ${r.driver?.name}, Status: ${r.status}, PunchIn: ${r.punchIn?.time}, PunchOut: ${r.punchOut?.time}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDuties();
