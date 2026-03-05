const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

async function checkVehicle() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const vehicle = await Vehicle.findOne({ carNumber: /9821/ });
        if (vehicle) {
            console.log('Vehicle details:');
            console.log(JSON.stringify(vehicle, null, 2));
        } else {
            console.log('Vehicle not found');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkVehicle();
