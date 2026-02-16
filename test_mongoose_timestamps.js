const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const manualDate = new Date('2026-02-10T10:00:00Z');
        const carNumber = `TEST-${Math.random().toString(36).substring(7)}`;

        const vehicle = new Vehicle({
            carNumber,
            model: 'Test',
            permitType: 'Test',
            company: new mongoose.Types.ObjectId(),
            isOutsideCar: true
        });

        vehicle.createdAt = manualDate;
        await vehicle.save();

        const saved = await Vehicle.findById(vehicle._id);
        console.log(`Manual Date: ${manualDate.toISOString()}`);
        console.log(`Saved Date:  ${saved.createdAt.toISOString()}`);

        if (saved.createdAt.toISOString() === manualDate.toISOString()) {
            console.log('SUCCESS: Manual createdAt preserved');
        } else {
            console.log('FAILURE: Manual createdAt overwritten');
        }

        await Vehicle.deleteOne({ _id: vehicle._id });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

test();
