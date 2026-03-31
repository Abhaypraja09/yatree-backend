const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const cId = '69caf340162fc71dc07307d1'; // Abhay
        const out = await Vehicle.countDocuments({ company: cId, isOutsideCar: true });
        const fleet = await Vehicle.countDocuments({ company: cId, isOutsideCar: { $ne: true } });
        
        console.log(`Outside Vehicles: ${out}`);
        console.log(`Fleet Vehicles: ${fleet}`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
