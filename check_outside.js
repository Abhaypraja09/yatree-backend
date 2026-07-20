const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const targetDate = '2026-07-20';
    const cars = await Vehicle.find({
        isOutsideCar: true,
        carNumber: { $regex: new RegExp(`#${targetDate}(#|$)`) }
    }).lean();
    
    console.log("Outside Cars Today:", cars.map(c => ({ carNumber: c.carNumber, dutyAmount: c.dutyAmount })));
    process.exit(0);
});
