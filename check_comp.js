const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function checkComp() {
    try {
        await mongoose.connect(latestAtlasURI);
        const v = await Vehicle.findOne({ carNumber: 'RJ-27-TA-6168' });
        console.log('Vehicle Company:', v.company);
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
checkComp();
