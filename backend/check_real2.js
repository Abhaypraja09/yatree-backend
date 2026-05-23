require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

async function checkReal() {
    let out = '';
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
        const Maintenance = mongoose.model('Maintenance', new mongoose.Schema({}, { strict: false }));
        
        const vs = await Vehicle.find({ carNumber: /1370/ }).lean();
        out += `VEHICLES FOUND: ${vs.length}\n`;
        
        for (const v of vs) {
            out += '---\n';
            out += `CAR: ${v.carNumber}\n`;
            out += `lastOdometer: ${v.lastOdometer}\n`;
            
            const records = await Maintenance.find({ vehicle: v._id }).sort({ billDate: -1, createdAt: -1 }).lean();
            out += `MAINTENANCES: ${records.length}\n`;
            for (const r of records) {
                out += `- Type: ${r.category}, Next KM: ${r.nextServiceKm}, BillDate: ${r.billDate}\n`;
            }
        }
        
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
        for (const v of vs) {
            const latestAtt = await Attendance.findOne({ vehicle: v._id }).sort({ date: -1, createdAt: -1 }).lean();
            if (latestAtt) {
                out += `LATEST ATTENDANCE FOR ${v.carNumber}\n`;
                out += `Date: ${latestAtt.date}, PunchIn: ${latestAtt.punchIn?.km}, PunchOut: ${latestAtt.punchOut?.km}\n`;
            }
        }
        
        fs.writeFileSync('check_real_output.txt', out, 'utf8');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkReal();
