const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const Attendance = require('./src/models/Attendance');
const User = require('./src/models/User');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const abhay = await User.findOne({ name: 'Abhay' });
    const atts = await Attendance.find({ driver: abhay._id }).sort({ createdAt: 1 });
    console.log('--- AUDIT START ---');
    atts.forEach(a => {
        console.log(JSON.stringify({
            id: a._id,
            date: a.date,
            dailyWage: a.dailyWage,
            status: a.status,
            createdAt: a.createdAt
        }));
    });
    process.exit();
}
check();
