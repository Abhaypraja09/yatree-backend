const mongoose = require('mongoose');
const User = require('./src/models/User');
const Vehicle = require('./src/models/Vehicle');
const Attendance = require('./src/models/Attendance');
require('dotenv').config();

async function checkActiveDuties() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const activeDuties = await Attendance.find({ status: 'incomplete' })
        .populate('driver', 'name')
        .populate('vehicle', 'carNumber');

    console.log(`Total Incomplete Shifts found in DB: ${activeDuties.length}`);
    
    activeDuties.forEach(d => {
        console.log(`- Driver: ${d.driver?.name || 'Unknown'}, Date: ${d.date}, Car: ${d.vehicle?.carNumber || 'N/A'}`);
    });

    process.exit();
}

checkActiveDuties();
