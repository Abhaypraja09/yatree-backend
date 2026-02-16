const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

const checkOutsideCars = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const cars = await Vehicle.find({ isOutsideCar: true }).sort({ createdAt: -1 }).limit(10);
        console.log('--- LAST 10 OUTSIDE CARS ---');
        cars.forEach(c => {
            console.log(`CAR_NUM: ${c.carNumber}`);
        });

        const yesterday = '2026-02-12';
        console.log(`--- SEARCHING FOR ${yesterday} ---`);
        const yesterdayCars = await Vehicle.find({
            isOutsideCar: true,
            carNumber: { $regex: yesterday }
        });
        console.log(`Found ${yesterdayCars.length} cars for ${yesterday}`);
        yesterdayCars.forEach(c => console.log(`YESTERDAY: ${c.carNumber}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkOutsideCars();
