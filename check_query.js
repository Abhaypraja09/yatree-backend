const mongoose = require('mongoose');
const Maintenance = require('./src/models/Maintenance');
const Vehicle = require('./src/models/Vehicle'); // Ensure Vehicle is loaded for populate

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function checkQuery() {
    try {
        await mongoose.connect(latestAtlasURI);
        const companyId = new mongoose.Types.ObjectId('6982e88b7d0b069a49db197b9');
        const records = await Maintenance.find({
            company: companyId,
            nextServiceKm: { $gt: 0 },
            status: 'Completed'
        }).populate('vehicle');

        console.log('RECORDS_FOUND:', records.length);
        records.forEach(r => {
            console.log(`Car: ${r.vehicle?.carNumber}, Next: ${r.nextServiceKm}, CurrentOdo: ${r.vehicle?.lastOdometer}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
checkQuery();
