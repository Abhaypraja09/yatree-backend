const mongoose = require('mongoose');

async function checkMaintenance() {
    try {
        await mongoose.connect('mongodb://localhost:27017/fleet');
        const Maintenance = mongoose.model('Maintenance', new mongoose.Schema({}, { strict: false }));
        const vehicleId = '662761899144422da33d6928'; // UP 16 MT 1370
        
        const records = await Maintenance.find({ vehicle: new mongoose.Types.ObjectId(vehicleId) })
            .sort({ billDate: -1, createdAt: -1 })
            .limit(5)
            .lean();
            
        console.log(JSON.stringify(records, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkMaintenance();
