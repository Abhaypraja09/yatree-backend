const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const Maintenance = require('./src/models/Maintenance');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const types = await Maintenance.distinct('maintenanceType');
    console.log('Maintenance Types:', types);
    const cats = await Maintenance.distinct('category');
    console.log('Categories:', cats);
    process.exit();
}
check();
