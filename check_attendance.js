const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const User = require('./src/models/User');
const Vehicle = require('./src/models/Vehicle');
const { DateTime } = require('luxon');

async function check() {
    await mongoose.connect('mongodb://localhost:27017/taxi-fleet-crm');
    console.log('Connected');

    const targetDate = '2026-02-24';
    const driverName = 'Arjun Bhat';

    const driver = await User.findOne({ name: driverName });
    if (!driver) {
        console.log('Driver not found');
        return;
    }

    const attendances = await Attendance.find({
        driver: driver._id,
        date: targetDate
    }).populate('vehicle');

    console.log(`Found ${attendances.length} attendance records for ${driverName} on ${targetDate}`);

    attendances.forEach((a, i) => {
        console.log(`\nRecord ${i + 1}:`);
        console.log(`ID: ${a._id}`);
        console.log(`Status: ${a.status}`);
        console.log(`Vehicle: ${a.vehicle?.carNumber}`);
        console.log(`Fuel Amount: ${a.fuel?.amount}`);
        console.log(`Pending Expenses Count: ${a.pendingExpenses?.length}`);
        if (a.pendingExpenses) {
            a.pendingExpenses.forEach((e, ei) => {
                console.log(`  Expense ${ei + 1}: Type=${e.type}, Amount=${e.amount}, Status=${e.status}`);
            });
        }
    });

    await mongoose.disconnect();
}

check();
