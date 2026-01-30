const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const vs = await Vehicle.find();
    console.log('--- ALL DOCUMENTS ---');
    for (const v of vs) {
        for (const d of v.documents) {
            console.log(`${v.carNumber} | ${d.documentType} | ${d.expiryDate.toISOString()}`);
        }
    }
    process.exit();
}
run();
