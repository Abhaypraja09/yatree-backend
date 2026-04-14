const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
require('dotenv').config();

const migrateAllToBuy = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await Vehicle.updateMany(
            { isOutsideCar: true },
            { $set: { transactionType: 'Buy' } }
        );
        console.log(`Successfully moved ALL ${result.modifiedCount} outside car records to 'Buy'.`);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

migrateAllToBuy();
