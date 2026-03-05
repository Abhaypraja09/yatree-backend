const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');

async function checkVehicles() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const vehicles = await Vehicle.find({ isOutsideCar: { $ne: true } }).populate('currentDriver', 'name tripStatus');

        console.log(`Total Fleet Vehicles found: ${vehicles.length}`);
        vehicles.forEach((v, idx) => {
            const driverInfo = v.currentDriver ? `${v.currentDriver.name} (${v.currentDriver.tripStatus})` : 'UNASSIGNED';
            console.log(`${idx + 1}. Car: ${v.carNumber}, Driver: ${driverInfo}, ID: ${v._id}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkVehicles();
