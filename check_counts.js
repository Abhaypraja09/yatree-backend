const mongoose = require('mongoose');
const User = require('./src/models/User');
const Vehicle = require('./src/models/Vehicle');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const coId = new mongoose.Types.ObjectId('69caf340162fc71dc07307d1');
    const drivers = await User.countDocuments({ company: coId, role: 'Driver' });
    const vehicles = await Vehicle.countDocuments({ company: coId });
    const totalDrivers = await User.countDocuments({ role: 'Driver' });
    const totalVehicles = await Vehicle.countDocuments();
    
    console.log('COMPANY:', coId);
    console.log('Drivers in this Co:', drivers);
    console.log('Vehicles in this Co:', vehicles);
    console.log('Total Drivers in DB:', totalDrivers);
    console.log('Total Vehicles in DB:', totalVehicles);
    
    await mongoose.disconnect();
}
check();
