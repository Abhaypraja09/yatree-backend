const mongoose = require('mongoose');
const path = require('path');
// Path relative to the script location
const Vehicle = require(path.join(__dirname, '../src/models/Vehicle'));
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function audit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- VEHICLE AUDIT ---');
        
        const total = await Vehicle.countDocuments();
        const internal = await Vehicle.countDocuments({ isOutsideCar: { $ne: true } });
        const outside = await Vehicle.countDocuments({ isOutsideCar: true });
        
        console.log('Total Vehicles in DB:', total);
        console.log('Internal (Own) Fleet:', internal);
        console.log('Outside/Market Cars:', outside);
        
        const sample = await Vehicle.find().limit(5).select('carNumber isOutsideCar vehicleSource');
        console.log('Sample Data:', JSON.stringify(sample, null, 2));
    } catch (err) {
        console.error('Audit failed:', err.message);
    } finally {
        process.exit();
    }
}
audit();
