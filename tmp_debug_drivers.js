const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

async function debug() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));

    const companyId = '6982e8b7d0b069a49db197b9';
    const staffDrivers = await User.find({
        $or: [
            { company: new mongoose.Types.ObjectId(companyId) },
            { company: companyId }
        ],
        role: 'Driver',
        isFreelancer: { $ne: true }
    });

    console.log('Total non-freelancer drivers found:', staffDrivers.length);
    const driverIds = staffDrivers.map(d => d._id);
    const todayStr = new Date().toLocaleDateString('en-CA');
    console.log('Today string (en-CA):', todayStr);

    const activeAt = await Attendance.find({
        driver: { $in: driverIds },
        status: 'incomplete'
    }).select('driver');

    const completedToday = await Attendance.find({
        driver: { $in: driverIds },
        status: 'completed',
        date: todayStr
    }).select('driver');

    console.log('Non-Freelancer Active count:', activeAt.length);
    console.log('Non-Freelancer Completed today count:', completedToday.length);

    // If counts are 0, try for ANY company? No, user is on this company.
    // Try without isFreelancer filter for attendance but with it for count?
    // Let's just see who is active.

    const allActive = await Attendance.find({ status: 'incomplete' }).populate('driver');
    console.log('\nAll Active Attendances globally (drivers):', allActive.map(a => `${a.driver?.name} (${a.driver?.isFreelancer ? 'Freelancer' : 'Staff'})`));

    process.exit();
}

debug();
