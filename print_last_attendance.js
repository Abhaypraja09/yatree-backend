const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

require('./src/models/Company');
require('./src/models/Vehicle');
require('./src/models/User');
const Attendance = require('./src/models/Attendance');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const last = await Attendance.find().populate('driver', 'name').sort({ createdAt: -1 }).limit(5);

        console.log('--- START ---');
        last.forEach(a => {
            console.log(`DRIVER: ${a.driver?.name}`);
            console.log(`DUETY_DATE: ${a.date}`);
            console.log(`CREATED_AT: ${a.createdAt.toISOString()}`);
            console.log('---');
        });
        console.log('--- END ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
