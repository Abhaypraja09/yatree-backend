const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function clearSpecialPay() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({ 
            punchOut: { specialPay: Number }
        }), 'attendances');

        const result = await Attendance.updateMany(
            { 'punchOut.specialPay': { $gt: 0 } },
            { $set: { 'punchOut.specialPay': 0 } }
        );

        console.log(`Successfully cleared Special Pay for ${result.modifiedCount} records.`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

clearSpecialPay();
