const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

// Register models
require('./src/models/User');
require('./src/models/Vehicle');
const Attendance = require('./src/models/Attendance');

async function checkAmrit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const records = await Attendance.find({})
            .populate('driver')
            .populate('vehicle')
            .sort({ createdAt: -1 });

        const amritRecords = records.filter(r => r.driver?.name?.includes('Amrit'));

        console.log('Amrit Records (Most recent first):');
        amritRecords.forEach(r => {
            console.log(`ID: ${r._id}, Date: ${r.date}, Status: ${r.status}, Vehicle: ${r.vehicle?.carNumber}, PunchIn: ${r.punchIn?.time}, PunchOut: ${r.punchOut?.time}, totalKM: ${r.totalKM}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAmrit();
