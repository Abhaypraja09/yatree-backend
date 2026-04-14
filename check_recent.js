const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

require('./src/models/User');
require('./src/models/Vehicle');
const Attendance = require('./src/models/Attendance');

async function checkRecentAttendance() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        // Check for ANY records updated in the last 10 minutes
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const records = await Attendance.find({
            updatedAt: { $gte: tenMinsAgo }
        }).populate('driver').populate('vehicle');

        console.log(`Found ${records.length} recent records:`);
        records.forEach(r => {
            console.log(`ID: ${r._id}, Driver: ${r.driver?.name}, Status: ${r.status}, UpdateTime: ${r.updatedAt}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRecentAttendance();
