const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const vehicles = await Vehicle.find({ isOutsideCar: true });
        console.log(`Found ${vehicles.length} outside cars`);

        vehicles.forEach(v => {
            console.log(`ID: ${v._id} | CAR: "${v.carNumber}" | DATE: ${v.createdAt.toISOString()}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
