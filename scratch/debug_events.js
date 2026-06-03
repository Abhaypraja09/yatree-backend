require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yatree').then(async () => {
    try {
        const Vehicle = require('./src/models/Vehicle');
        const Attendance = require('./src/models/Attendance');

        const outCars = await Vehicle.find({ isOutsideCar: true });
        const events = outCars.filter(v => v.eventId);
        console.log('Outside Cars with EventId:', events.length);
        if(events.length > 0) {
            console.log('Sample Event Outside Car dutyAmount:', events[0].dutyAmount, 'carNumber:', events[0].carNumber);
        }

        const atts = await Attendance.find({ eventId: { $ne: null } });
        console.log('Attendance with EventId:', atts.length);
        if(atts.length > 0) {
            console.log('Sample Event Attendance dailyWage:', atts[0].dailyWage, 'date:', atts[0].date);
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});
