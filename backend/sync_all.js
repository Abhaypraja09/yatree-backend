require('dotenv').config();
const mongoose = require('mongoose');
const { syncVehicleOdometer } = require('./src/utils/odometerUtils');

async function syncAll() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Vehicle = require('./src/models/Vehicle');
        
        const vehicles = await Vehicle.find({}).lean();
        console.log(`Found ${vehicles.length} vehicles. Syncing...`);
        
        for (const v of vehicles) {
            await syncVehicleOdometer(v._id.toString());
        }
        
        console.log('Done!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

syncAll();
