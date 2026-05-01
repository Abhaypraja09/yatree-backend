const mongoose = require('mongoose');
const FuelEntry = require('./src/models/FuelEntry');
const dotenv = require('dotenv');
dotenv.config();

async function checkFuel() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const fuel = await FuelEntry.find({ remarks: { $regex: /fastag/i } });
    console.log(`Found ${fuel.length} fuel entries with 'fastag' in remarks`);
    fuel.forEach(f => {
        console.log(`  - Date: ${f.date}, Amount: ${f.amount}, Remarks: ${f.remarks}`);
    });

    process.exit(0);
}

checkFuel().catch(err => {
    console.error(err);
    process.exit(1);
});
