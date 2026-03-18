const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const Parking = require('./src/models/Parking');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');

    // Sample date from screenshot
    const dateStr = '2026-03-15';
    const companyId = '6982e8b7d0b069a49db197b9'; // from logs

    const attRecords = await Attendance.find({ 
        date: dateStr,
        company: companyId
    }).lean();

    console.log('Attendance records:', attRecords.length);
    attRecords.forEach(a => {
        console.log(`Driver: ${a.driverId}, PunchOut.tollParkingAmount: ${a.punchOut?.tollParkingAmount}`);
    });

    const parkingRecords = await Parking.find({
        date: { $gte: new Date(dateStr + 'T00:00:00'), $lte: new Date(dateStr + 'T23:59:59') },
        company: companyId
    }).lean();

    console.log('Parking records:', parkingRecords.length);
    parkingRecords.forEach(p => {
        console.log(`Vehicle: ${p.vehicle}, Amount: ${p.amount}, Date: ${p.date}`);
    });

    await mongoose.disconnect();
}

check();
