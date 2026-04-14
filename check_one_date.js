const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const Attendance = require('./src/models/Attendance');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const cId = '69caf340162fc71dc07307d1'; // Abhay
        const one = await Attendance.findOne({ company: cId });
        
        if (one) {
            console.log(`Abhay Attendance Record Date: ${one.date}`);
        } else {
            console.log(`No records found in Abhay!`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
