const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const Attendance = require('./src/models/Attendance');
const User = require('./src/models/User');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const abhay = await User.findOne({ name: 'Abhay' });
    const atts = await Attendance.find({ driver: abhay._id }).sort({ date: 1 });
    for (const a of atts) {
        process.stdout.write(`RAW|${Array.from(a.date).map(c => c.charCodeAt(0)).join(',')}|STRING|${a.date}\n`);
    }
    process.exit();
}
check();
