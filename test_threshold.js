const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const Maintenance = mongoose.model('Maintenance', new mongoose.Schema({
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    company: mongoose.Schema.Types.ObjectId,
    nextServiceKm: Number,
    status: String
}, { timestamps: true }));

const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({
    carNumber: String,
    lastOdometer: Number,
    company: mongoose.Schema.Types.ObjectId
}));

async function testThreshold() {
    try {
        await mongoose.connect(latestAtlasURI);
        const compId = '6982e8b7d0b069a49db197b9';

        // Find vehicle
        const v = await Vehicle.findOne({ carNumber: 'RJ-27-TA-6168' });
        // Set odometer to exactly 500 KM before next service
        // We know nextServiceKm is 118905 from previous scripts
        v.lastOdometer = 118905 - 500; // 118405
        await v.save();
        console.log(`Set odometer to ${v.lastOdometer} (500 KM before 118905)`);

        // Now run the logic
        const s = await Maintenance.findOne({ vehicle: v._id, status: 'Completed', nextServiceKm: 118905 });
        if (s) {
            const currentKm = v.lastOdometer || 0;
            const kmRemaining = s.nextServiceKm - currentKm;
            console.log(`KM Remaining: ${kmRemaining}`);
            if (kmRemaining <= 500) {
                console.log('>>> ALERT WOULD SHOW RIGHT NOW');
            } else {
                console.log('>>> ALERT WOULD NOT SHOW');
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
testThreshold();
