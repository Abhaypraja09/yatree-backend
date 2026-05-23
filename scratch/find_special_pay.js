const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function findSpecialPay() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({ 
            driver: mongoose.Schema.Types.ObjectId,
            punchOut: { specialPay: Number },
            pendingExpenses: Array,
            date: String
        }), 'attendances');

        const docs = await Attendance.find({ 
            $or: [
                { 'punchOut.specialPay': { $gt: 0 } },
                { 'pendingExpenses': { $elemMatch: { type: 'special_pay', status: 'approved', amount: { $gt: 0 } } } }
            ]
        });

        console.log(`Found ${docs.length} records with Special Pay:`);
        docs.forEach(d => {
            console.log(`DriverID: ${d.driver}, Date: ${d.date}, PunchOut SP: ${d.punchOut?.specialPay}, Pending SP: ${d.pendingExpenses.filter(e => e.type === 'special_pay').reduce((s,e) => s + (e.amount||0), 0)}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

findSpecialPay();
