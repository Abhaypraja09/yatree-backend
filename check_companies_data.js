const mongoose = require('mongoose');
const User = require('./src/models/User');
const Company = require('./src/models/Company');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const companies = await Company.find();
    console.log('COMPANIES_START');
    for (const c of companies) {
        const drivers = await User.countDocuments({ company: c._id, role: 'Driver' });
        console.log(`${c.name} (${c._id}): ${drivers} Drivers`);
    }
    const noCoDrivers = await User.countDocuments({ company: null, role: 'Driver' });
    console.log(`No Company: ${noCoDrivers} Drivers`);
    console.log('COMPANIES_END');
    
    await mongoose.disconnect();
}
check();
