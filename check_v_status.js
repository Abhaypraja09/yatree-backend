const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const cId = '69caf340162fc71dc07307d1'; // Abhay
        const v = await Vehicle.findOne({ company: cId });
        
        if (v) {
            console.log(`Car Number: ${v.carNumber}`);
            console.log(`Status: ${v.status}`);
        } else {
            console.log(`No vehicles found in Abhay!`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
