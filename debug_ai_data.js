const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const admin = await User.findOne({ role: 'Admin' });
    if (!admin) {
        console.log('No Admin found');
        process.exit();
    }
    const companyId = admin.company;
    console.log('Admin Company ID:', companyId);

    const pendingAtt = await Attendance.find({
        company: companyId,
        'pendingExpenses.status': 'pending'
    }).lean();

    console.log('Found Attendance with pending records:', pendingAtt.length);
    if (pendingAtt.length > 0) {
        pendingAtt.forEach(att => {
            console.log(`Attendance ID: ${att._id}, Date: ${att.date}`);
            att.pendingExpenses.forEach(exp => {
                console.log(`  - Type: ${exp.type}, Status: ${exp.status}, Amount: ${exp.amount}`);
            });
        });
    }

    const runningCars = await Vehicle.find({ company: companyId, status: 'Running' });
    console.log('Vehicles with status Running:', runningCars.length);

    const allVehicles = await Vehicle.find({ company: companyId });
    console.log('Total Vehicles:', allVehicles.length);
    if (allVehicles.length > 0) {
        console.log('Status of first 5 vehicles:', allVehicles.slice(0, 5).map(v => v.status));
    }

    const activeDrivers = await Attendance.find({ company: companyId, status: 'incomplete' });
    console.log('Drivers with active shifts (incomplete):', activeDrivers.length);

    process.exit();
}

check();
