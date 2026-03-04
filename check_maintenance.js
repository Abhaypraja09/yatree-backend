const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
const Maintenance = require('./src/models/Maintenance');
const Attendance = require('./src/models/Attendance');
require('dotenv').config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const vehicle = await Vehicle.findOne({ carNumber: 'RJ-27-TB-1370' });
        if (!vehicle) {
            console.log('Vehicle not found');
            process.exit(0);
        }
        console.log('Vehicle CarNumber:', vehicle.carNumber);
        console.log('Vehicle Last Odometer:', vehicle.lastOdometer);

        const maintenance = await Maintenance.find({ vehicle: vehicle._id }).sort({ createdAt: -1 });
        console.log('Maintenance Records Count:', maintenance.length);
        maintenance.forEach(m => {
            console.log(`--- Record ---`);
            console.log(`Type: ${m.maintenanceType}`);
            console.log(`Category: ${m.category}`);
            console.log(`Current KM: ${m.currentKm}`);
            console.log(`Next Service KM: ${m.nextServiceKm}`);
            console.log(`Next Service Date: ${m.nextServiceDate}`);
            console.log(`Status: ${m.status}`);
        });

        const attendance = await Attendance.find({ vehicle: vehicle._id }).sort({ date: -1 }).limit(10);
        console.log('Recent Attendance KM Readings:');
        attendance.forEach(a => {
            console.log(`Date: ${a.date}, In: ${a.punchIn?.km}, Out: ${a.punchOut?.km}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkData();
