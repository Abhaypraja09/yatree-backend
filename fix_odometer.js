const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
require('dotenv').config();

async function fixOdometer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const vehicle = await Vehicle.findOne({ carNumber: 'RJ-27-TB-1370' });
        if (!vehicle) {
            console.log('Vehicle not found');
            process.exit(0);
        }

        console.log('Current Last Odometer:', vehicle.lastOdometer);

        // The correct KM from attendance is 191847
        const correctKm = 191847;

        vehicle.lastOdometer = correctKm;
        await vehicle.save();

        console.log('Updated Last Odometer to:', vehicle.lastOdometer);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixOdometer();
