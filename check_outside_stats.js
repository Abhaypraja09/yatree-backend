const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
require('dotenv').config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const allOutside = await Vehicle.find({ isOutsideCar: true });
        const stats = allOutside.reduce((acc, v) => {
            const type = v.transactionType || 'undefined';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        console.log('Current Stats for Outside Cars:', stats);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkData();
