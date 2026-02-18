const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const Maintenance = mongoose.model('Maintenance', new mongoose.Schema({
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    company: mongoose.Schema.Types.ObjectId,
    nextServiceKm: Number,
    nextServiceDate: Date,
    status: String
}, { timestamps: true }));

const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({
    carNumber: String,
    lastOdometer: Number,
    company: mongoose.Schema.Types.ObjectId
}));

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function runTest() {
    try {
        await mongoose.connect(latestAtlasURI);
        const compId = '6982e88b7d0b069a49db197b9';

        const upcomingServices = await Maintenance.find({
            company: compId,
            $or: [
                { nextServiceKm: { $gt: 0 } },
                { nextServiceDate: { $exists: true } }
            ],
            status: 'Completed'
        }).populate('vehicle').sort({ createdAt: -1 });

        console.log('RECORDS:', upcomingServices.length);

        const alerts = [];
        const kmAlertedVehicles = new Set();

        upcomingServices.forEach(s => {
            if (s.nextServiceKm && s.vehicle && !kmAlertedVehicles.has(s.vehicle._id.toString())) {
                const currentKm = s.vehicle.lastOdometer || 0;
                const kmRemaining = s.nextServiceKm - currentKm;
                console.log(`- ${s.vehicle.carNumber}: Cur=${currentKm}, Next=${s.nextServiceKm}, Diff=${kmRemaining}`);
                if (kmRemaining <= 500) {
                    kmAlertedVehicles.add(s.vehicle._id.toString());
                    alerts.push({ id: s.vehicle.carNumber, rem: kmRemaining });
                }
            }
        });

        console.log('ALERTS:', JSON.stringify(alerts, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
runTest();
