const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function forceUpdate() {
    try {
        await mongoose.connect(latestAtlasURI);
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ carNumber: String, lastOdometer: Number }));
        const v = await Vehicle.findOne({ carNumber: 'RJ-27-TA-6168' });
        if (v) {
            v.lastOdometer = 118899; // 6 KM left
            await v.save();
            console.log('Updated RJ-27-TA-6168 to 118899 KM (6 KM Left)');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
forceUpdate();
