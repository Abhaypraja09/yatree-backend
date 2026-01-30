const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
require('dotenv').config();

async function list() {
    await mongoose.connect(process.env.MONGODB_URI);
    const vehicles = await Vehicle.find();
    console.log('--- CURRENT VEHICLE EXPIRIES ---');
    vehicles.forEach(v => {
        console.log(`Car: ${v.carNumber}`);
        v.documents.forEach(doc => {
            console.log(` - ${doc.documentType}: ${doc.expiryDate.toISOString()} (${new Date(doc.expiryDate).toLocaleDateString('en-IN')})`);
        });
    });
    console.log('-------------------------------');
    process.exit();
}
list();
