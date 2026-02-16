const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const vehicles = await Vehicle.find({ isOutsideCar: true }).sort({ createdAt: -1 }).limit(5);

        console.log('--- START ---');
        vehicles.forEach(v => {
            console.log(`PLATE: ${v.carNumber}`);
            console.log(`CREATED_AT: ${v.createdAt.toISOString()}`);
            console.log('---');
        });
        console.log('--- END ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
