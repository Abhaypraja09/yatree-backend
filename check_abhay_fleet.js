const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const cId = new mongoose.Types.ObjectId('69caf340162fc71dc07307d1');
        const count = await Vehicle.countDocuments({ company: cId });
        const outsideCount = await Vehicle.countDocuments({ company: cId, isOutsideCar: true });
        console.log(`Company Abhay SuperX Fleet (69caf...):`);
        console.log(`- Total Vehicles: ${count}`);
        console.log(`- Outside Vehicles: ${outsideCount}`);
        console.log(`- Fleet Vehicles: ${count - outsideCount}`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
