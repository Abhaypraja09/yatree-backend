const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
require('dotenv').config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const allOutside = await Vehicle.find({ isOutsideCar: true });
        const withEvent = allOutside.filter(v => v.eventId);
        const withoutEvent = allOutside.filter(v => !v.eventId);

        console.log(`Total Outside: ${allOutside.length}`);
        console.log(`With Event: ${withEvent.length}`);
        console.log(`Without Event: ${withoutEvent.length}`);
        
        const eventStats = withEvent.reduce((acc, v) => {
            const type = v.transactionType || 'undefined';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        console.log('Event Stats:', eventStats);

        const outsideStats = withoutEvent.reduce((acc, v) => {
            const type = v.transactionType || 'undefined';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        console.log('Outside (No Event) Stats:', outsideStats);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkData();
