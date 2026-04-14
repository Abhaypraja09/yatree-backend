const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const cId = '69caf340162fc71dc07307d1'; // Abhay
        
        const fleet = await Vehicle.countDocuments({ company: cId, isOutsideCar: { $ne: true } });
        const outside = await Vehicle.countDocuments({ company: cId, isOutsideCar: true });
        
        const internalDrivers = await User.countDocuments({ company: cId, role: 'Driver', isFreelancer: { $ne: true } });
        const freelancerDrivers = await User.countDocuments({ company: cId, role: 'Driver', isFreelancer: true });
        
        console.log(`Abhay SuperX Fleet Summary:`);
        console.log(`- Fleet Vehicles: ${fleet}`);
        console.log(`- Outside Vehicles: ${outside}`);
        console.log(`- Internal Drivers: ${internalDrivers}`);
        console.log(`- Freelancer Drivers: ${freelancerDrivers}`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
