const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

require('./src/models/Vehicle');
const User = require('./src/models/User');

async function checkStuckDrivers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const drivers = await User.find({ role: 'Driver' });
        console.log(`Checking ${drivers.length} drivers...`);

        for (const drv of drivers) {
            if (drv.tripStatus === 'active' && !drv.assignedVehicle) {
                console.log(`Stuck Driver (Active but No Vehicle): ${drv.name} (ID: ${drv._id})`);
            }
            if (drv.assignedVehicle && drv.tripStatus !== 'active') {
                console.log(`Stuck Driver (Has Vehicle but Not Active): ${drv.name} (ID: ${drv._id}, Status: ${drv.tripStatus})`);
            }
        }

        console.log('Done');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkStuckDrivers();
