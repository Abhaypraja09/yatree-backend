const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
require('dotenv').config();

const migrateData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await Vehicle.updateMany(
            { isOutsideCar: true, transactionType: 'Duty' },
            { $set: { transactionType: 'Buy' } }
        );

        console.log(`Successfully migrated ${result.modifiedCount} documents from Duty to Buy.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateData();
