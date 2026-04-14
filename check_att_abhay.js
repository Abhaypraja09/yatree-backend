const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const Attendance = require('./src/models/Attendance');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const cId = '69caf340162fc71dc07307d1'; // Abhay
        const count = await Attendance.countDocuments({ company: cId });
        const one = await Attendance.findOne({ company: cId });
        
        console.log(`Attendance Summary for Abhay:`);
        console.log(`- Total Records: ${count}`);
        if (one) {
            console.log(`- One Record Company ID: ${one.company}`);
            console.log(`- One Record Company Type: ${typeof one.company}`);
            console.log(`- Is ObjectId: ${one.company instanceof mongoose.Types.ObjectId}`);
            console.log(`- Date of record: ${one.date}`);
            console.log(`- Driver ID: ${one.driver}`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
