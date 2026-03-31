const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const Maintenance = require('./src/models/Maintenance');
const BorderTax = require('./src/models/BorderTax');
const Parking = require('./src/models/Parking');
const Fuel = require('./src/models/Fuel');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const cId = '69caf340162fc71dc07307d1'; // Abhay
        
        const m = await Maintenance.countDocuments({ company: cId });
        const b = await BorderTax.countDocuments({ company: cId });
        const p = await Parking.countDocuments({ company: cId });
        const f = await Fuel.countDocuments({ company: cId });
        
        console.log(`Company ID: ${cId}`);
        console.log(`- Maintenance: ${m}`);
        console.log(`- BorderTax: ${b}`);
        console.log(`- Parking: ${p}`);
        console.log(`- Fuel: ${f}`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
