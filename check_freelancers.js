const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');
require('./src/models/Vehicle');
const Attendance = require('./src/models/Attendance');

async function checkFreelancers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        // Check all freelancers and their status
        const freelancers = await User.find({ role: 'Driver', isFreelancer: true }).populate('assignedVehicle');
        console.log(`\n=== FREELANCERS STATUS ===`);
        for (const f of freelancers) {
            const incompleteAtt = await Attendance.findOne({ driver: f._id, status: 'incomplete' });
            console.log(`Name: ${f.name}, TripStatus: ${f.tripStatus}, AssignedVehicle: ${f.assignedVehicle?.carNumber || 'None'}, HasActiveAttendance: ${!!incompleteAtt}`);
        }

        // Check active freelancers with no attendance (stuck)
        const activeFreelancers = await User.find({ role: 'Driver', isFreelancer: true, tripStatus: 'active' });
        console.log(`\n=== ACTIVE FREELANCERS ===`);
        for (const f of activeFreelancers) {
            const incompleteAtt = await Attendance.findOne({ driver: f._id, status: 'incomplete' });
            console.log(`Name: ${f.name}, HasActiveAttendance: ${!!incompleteAtt}`);
            if (!incompleteAtt) {
                console.log(`  ⚠️  STUCK! Driver is 'active' but has no incomplete attendance`);
            }
        }

        // Check today's attendance
        const today = new Date().toISOString().split('T')[0];
        const todayAttendances = await Attendance.find({ date: today, status: 'incomplete' }).populate('driver vehicle');
        console.log(`\n=== TODAY'S INCOMPLETE DUTIES (${today}) ===`);
        todayAttendances.forEach(a => {
            console.log(`Driver: ${a.driver?.name}, Vehicle: ${a.vehicle?.carNumber}, Status: ${a.status}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkFreelancers();
