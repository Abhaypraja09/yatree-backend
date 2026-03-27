const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');
const Parking = require('./src/models/Parking');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const targetDate = '2026-03-24';
    
    console.log('--- ATTENDANCE ---');
    const atts = await Attendance.find({ date: targetDate }).populate('driver').populate('vehicle');
    console.log('Count:', atts.length);
    atts.forEach(a => {
        const d = a.driver;
        console.log(`Driver: ${d?.name}, isF(User): ${d?.isFreelancer}, isF(Att): ${a.isFreelancer}, Wage: ${a.dailyWage || d?.dailyWage || d?.salary/26}, Parking: ${a.punchOut?.tollParkingAmount || 0}`);
    });

    console.log('\n--- OUTSIDE VEHICLES (VOUCHERS) ---');
    const outside = await Vehicle.find({ isOutsideCar: true, carNumber: { $regex: `#${targetDate}` } });
    console.log('Count:', outside.length);

    await mongoose.disconnect();
}

check();
