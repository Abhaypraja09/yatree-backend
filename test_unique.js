const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const targetDate = '2026-03-24';
    
    const atts = await Attendance.find({ date: targetDate }).populate('driver');
    console.log('Total Records:', atts.length);
    
    const uniqueDrivers = new Set();
    atts.forEach(a => {
        if(a.driver) uniqueDrivers.add(a.driver._id.toString());
    });
    console.log('Unique Drivers:', uniqueDrivers.size);

    for(let id of uniqueDrivers) {
        const d = await User.findById(id);
        console.log(`Driver: ${d.name}, isF: ${d.isFreelancer}, Wage: ${d.dailyWage}`);
    }

    await mongoose.disconnect();
}

check();
