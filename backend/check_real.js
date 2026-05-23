require('dotenv').config();
const mongoose = require('mongoose');

async function checkReal() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
        const Maintenance = mongoose.model('Maintenance', new mongoose.Schema({}, { strict: false }));
        
        const vs = await Vehicle.find({ carNumber: /1370/ }).lean();
        console.log('VEHICLES FOUND:', vs.length);
        
        for (const v of vs) {
            console.log('---');
            console.log('CAR:', v.carNumber);
            console.log('lastOdometer:', v.lastOdometer);
            
            const records = await Maintenance.find({ vehicle: v._id }).sort({ billDate: -1, createdAt: -1 }).lean();
            console.log('MAINTENANCES:', records.length);
            for (const r of records) {
                console.log(`- Type: ${r.category}, Next KM: ${r.nextServiceKm}, BillDate: ${r.billDate}`);
            }
        }
        
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
        for (const v of vs) {
            const latestAtt = await Attendance.findOne({ vehicle: v._id }).sort({ date: -1, createdAt: -1 }).lean();
            if (latestAtt) {
                console.log('LATEST ATTENDANCE FOR', v.carNumber);
                console.log(`Date: ${latestAtt.date}, PunchIn: ${latestAtt.punchIn?.km}, PunchOut: ${latestAtt.punchOut?.km}`);
            }
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkReal();
