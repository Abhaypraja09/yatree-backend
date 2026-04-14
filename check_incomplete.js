const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

require('./src/models/User');
require('./src/models/Vehicle');
const Attendance = require('./src/models/Attendance');

async function checkIncomplete() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const records = await Attendance.find({ status: 'incomplete' })
            .populate('driver')
            .populate('vehicle');

        console.log(`Incomplete Attendance Records (Count: ${records.length}):`);
        records.forEach(r => {
            console.log(`ID: ${r._id}, Date: ${r.date}, Driver: ${r.driver?.name} (${r.driver?.tripStatus}), Vehicle: ${r.vehicle?.carNumber}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkIncomplete();
