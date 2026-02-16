const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const vehicles = await Vehicle.find({ isOutsideCar: true }).sort({ createdAt: -1 }).limit(10);
        console.log(`Last 10 outside cars:`);

        vehicles.forEach(v => {
            console.log(`ID: ${v._id} | CAR: "${v.carNumber}" | DutyDate (from tag): ${v.carNumber?.split('#')[1]} | CreatedAt: ${v.createdAt.toISOString()}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
