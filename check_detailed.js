const mongoose = require('mongoose');
const Maintenance = require('./src/models/Maintenance');
const Vehicle = require('./src/models/Vehicle');

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function checkDetailed() {
    try {
        await mongoose.connect(latestAtlasURI);
        const v = await Vehicle.findOne({ carNumber: 'RJ-27-TA-6168' });
        if (v) {
            console.log('VEHICLE:', v.carNumber, 'LastOdometer:', v.lastOdometer);
            const m = await Maintenance.find({ vehicle: v._id });
            console.log('MAINTENANCE_RECORDS_COUNT:', m.length);
            m.forEach(r => {
                console.log(`- CurrentKM: ${r.currentKm}, NextServiceKM: ${r.nextServiceKm}, Status: ${r.status}, Date: ${r.billDate}`);
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
checkDetailed();
