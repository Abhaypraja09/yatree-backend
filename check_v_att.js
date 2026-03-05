const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

require('./src/models/User');
require('./src/models/Vehicle');
const Attendance = require('./src/models/Attendance');

async function checkVehicleAttendance() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const vehicleId = '6982efaa508a22188c618879'; // RJ-27-TA-9821
        const records = await Attendance.find({ vehicle: vehicleId })
            .populate('driver')
            .sort({ createdAt: -1 });

        console.log(`Attendance Records for RJ-27-TA-9821 (Count: ${records.length}):`);
        records.forEach(r => {
            console.log(`ID: ${r._id}, Date: ${r.date}, Status: ${r.status}, Driver: ${r.driver?.name}, isFreelancer: ${r.isFreelancer}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkVehicleAttendance();
