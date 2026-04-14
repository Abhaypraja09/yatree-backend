const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

require('./src/models/User');
const Vehicle = require('./src/models/Vehicle');
const Attendance = require('./src/models/Attendance');

async function healVehicles() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const vehicles = await Vehicle.find({ isOutsideCar: { $ne: true } });
        console.log(`Checking ${vehicles.length} vehicles...`);

        for (const v of vehicles) {
            if (v.currentDriver) {
                // Check if this driver actually has an incomplete shift with this vehicle
                const activeAttendance = await Attendance.findOne({
                    vehicle: v._id,
                    driver: v.currentDriver,
                    status: 'incomplete'
                });

                if (!activeAttendance) {
                    console.log(`Healing vehicle ${v.carNumber}: Clearing currentDriver ${v.currentDriver}`);
                    v.currentDriver = null;
                    await v.save();
                } else {
                    console.log(`Vehicle ${v.carNumber} is validly assigned to driver ${v.currentDriver} (Attendance: ${activeAttendance._id})`);
                }
            }
        }

        console.log('Heal complete');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

healVehicles();
