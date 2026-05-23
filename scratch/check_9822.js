const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Attendance = require('../src/models/Attendance');
const Fuel = require('../src/models/Fuel');
const Vehicle = require('../src/models/Vehicle');

async function check9822() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');

        const v = await Vehicle.findOne({ carNumber: /9822/ });
        if (!v) {
            console.log('Vehicle not found');
            process.exit();
        }
        console.log('Vehicle:', v.carNumber, 'ID:', v._id);

        const startStr = '2026-04-01';
        const startJS = new Date('2026-04-01');

        const atts = await Attendance.find({ 
            vehicle: v._id, 
            date: { $gte: startStr } 
        });
        const totalKM = atts.reduce((sum, a) => sum + (a.totalKM || 0), 0);
        console.log('April Attendance Count:', atts.length);
        console.log('April Total Attendance KM field:', totalKM);
        
        let kmDiffSum = 0;
        atts.forEach(a => {
            if(a.punchIn?.km && a.punchOut?.km) {
                const diff = a.punchOut.km - a.punchIn.km;
                if(diff > 0) kmDiffSum += diff;
            }
        });
        console.log('April Total Attendance KM Diff Sum:', kmDiffSum);
        
        let attendanceFuelSum = 0;
        atts.forEach(a => {
            if(a.fuel && a.fuel.amount) {
                attendanceFuelSum += a.fuel.amount;
            }
        });
        console.log('April Total Fuel inside Attendance records:', attendanceFuelSum);

        const fuels = await Fuel.find({ 
            vehicle: v._id, 
            date: { $gte: startJS } 
        });
        const totalFuel = fuels.reduce((sum, f) => sum + (f.amount || 0), 0);
        console.log('April Fuel Count:', fuels.length);
        console.log('April Total Fuel:', totalFuel);
        fuels.forEach(f => console.log(f.date, 'Amt:', f.amount, 'Dist:', f.distance, 'Odo:', f.odometer));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check9822();
