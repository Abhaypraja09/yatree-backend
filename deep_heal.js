const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');

async function deepHeal() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        // 1. Clear assignedVehicle for users who are NOT active
        const inactiveDriversWithVehicles = await User.find({
            role: 'Driver',
            tripStatus: { $ne: 'active' },
            assignedVehicle: { $ne: null }
        });

        for (const drv of inactiveDriversWithVehicles) {
            console.log(`Deep Healing Driver ${drv.name}: Clearing assignedVehicle ${drv.assignedVehicle} (Status: ${drv.tripStatus})`);
            drv.assignedVehicle = null;
            await drv.save();
        }

        // 2. Clear currentDriver for vehicles if the driver is NOT active or NOT assigned to THIS vehicle
        const vehicles = await Vehicle.find({ currentDriver: { $ne: null } });
        for (const v of vehicles) {
            const drv = await User.findById(v.currentDriver);
            if (!drv || drv.tripStatus !== 'active' || drv.assignedVehicle?.toString() !== v._id.toString()) {
                console.log(`Deep Healing Vehicle ${v.carNumber}: Clearing currentDriver ${v.currentDriver?.name || v.currentDriver}`);
                v.currentDriver = null;
                await v.save();
            }
        }

        console.log('Deep Heal complete');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

deepHeal();
