const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const vehicles = await Vehicle.find();
    const today = new Date();
    console.log(`Current Date: ${today.toISOString()}`);

    vehicles.forEach(v => {
        v.documents.forEach(doc => {
            const diff = (new Date(doc.expiryDate) - today) / (1000 * 60 * 60 * 24);
            console.log(`Car: ${v.carNumber}, Doc: ${doc.documentType}, Expiry: ${doc.expiryDate.toISOString()}, Days Left: ${diff.toFixed(1)}`);
        });
    });
    process.exit();
}
check();
