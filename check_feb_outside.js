const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const vehicles = await Vehicle.find({
            isOutsideCar: true,
            carNumber: { $regex: '#2026-02' }
        }).sort({ createdAt: -1 });

        console.log(`Found ${vehicles.length} outside cars for Feb 2026`);

        vehicles.forEach(v => {
            console.log(`ID: ${v._id} | Plate: "${v.carNumber}" | CreatedAt: ${v.createdAt.toISOString()}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
