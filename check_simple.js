const mongoose = require('mongoose');
const Maintenance = require('./src/models/Maintenance');
const Vehicle = require('./src/models/Vehicle');

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function checkData() {
    try {
        await mongoose.connect(latestAtlasURI);
        const v = await Vehicle.findOne({ carNumber: 'RJ-27-TA-6168' });
        if (v) {
            console.log('VEHICLE_INFO');
            console.log('Car:', v.carNumber);
            console.log('LastOdometer:', v.lastOdometer);

            const m = await Maintenance.find({ vehicle: v._id }).sort({ createdAt: -1 });
            console.log('MAINTENANCE_LOGS');
            m.forEach(rec => {
                console.log('---');
                console.log('Date:', rec.billDate);
                console.log('CurrentKM:', rec.currentKm);
                console.log('NextServiceKM:', rec.nextServiceKm);
                console.log('Status:', rec.status);
            });
        } else {
            console.log('Vehicle not found');
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}
checkData();
