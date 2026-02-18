const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function checkOdometers() {
    try {
        await mongoose.connect(latestAtlasURI);
        const vehicles = await Vehicle.find({ lastOdometer: { $gt: 0 } });
        console.log(`Found ${vehicles.length} vehicles with odometer > 0`);
        vehicles.forEach(v => {
            console.log(`${v.carNumber}: ${v.lastOdometer}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
checkOdometers();
