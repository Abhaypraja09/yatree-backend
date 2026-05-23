const mongoose = require('mongoose');

async function findVehicle() {
    try {
        await mongoose.connect('mongodb://localhost:27017/fleet');
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
        
        const v = await Vehicle.findOne({ carNumber: /1370/ }).lean();
        console.log('VEHICLE:', JSON.stringify(v, null, 2));
        
        if (v) {
            const Maintenance = mongoose.model('Maintenance', new mongoose.Schema({}, { strict: false }));
            const records = await Maintenance.find({ vehicle: v._id }).lean();
            console.log('MAINTENANCE RECORDS COUNT:', records.length);
            if (records.length > 0) {
                 console.log('LATEST RECORD:', JSON.stringify(records.sort((a,b) => b.billDate - a.billDate)[0], null, 2));
            }
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findVehicle();
