const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
const dotenv = require('dotenv');
dotenv.config();

async function checkFastag() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const vehicles = await Vehicle.find({});
    console.log(`Total Vehicles: ${vehicles.length}`);

    let totalLogs = 0;
    vehicles.forEach(v => {
        if (v.fastagHistory && v.fastagHistory.length > 0) {
            console.log(`Vehicle ${v.carNumber} (${v.isOutsideCar ? 'Outside' : 'Fleet'}): ${v.fastagHistory.length} logs`);
            v.fastagHistory.forEach(h => {
                console.log(`  - Date: ${h.date}, Amount: ${h.amount}`);
                totalLogs++;
            });
        }
    });

    console.log(`Total Fastag Logs Found: ${totalLogs}`);
    process.exit(0);
}

checkFastag().catch(err => {
    console.error(err);
    process.exit(1);
});
