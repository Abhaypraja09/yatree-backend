const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

// Models
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

async function debug() {
    try {
        await mongoose.connect(latestAtlasURI);
        const companyId = '6982e8b7d0b069a49db197b9';
        const baseDate = DateTime.now().setZone('Asia/Kolkata').startOf('day');
        const alertThreshold = baseDate.plus({ days: 30 });

        console.log('--- DEBUG START ---');
        console.log('Company:', companyId);

        const upcomingServices = await Maintenance.find({
            company: companyId,
            $or: [
                { nextServiceDate: { $lte: alertThreshold.toJSDate(), $gte: baseDate.minus({ days: 30 }).toJSDate() } },
                { nextServiceKm: { $gt: 0 } }
            ],
            status: 'Completed'
        }).populate('vehicle').sort({ createdAt: -1 });

        console.log('Upcoming Services Found:', upcomingServices.length);

        const expiringAlerts = [];
        const kmAlertedVehicles = new Set();

        upcomingServices.forEach((s, index) => {
            console.log(`\nChecking Record ${index}:`);
            console.log(`- Vehicle ID: ${s.vehicle?._id}`);
            console.log(`- Car Number: ${s.vehicle?.carNumber}`);
            console.log(`- Next Service KM: ${s.nextServiceKm}`);
            console.log(`- Last Odometer: ${s.vehicle?.lastOdometer}`);

            if (s.nextServiceKm && s.vehicle && !kmAlertedVehicles.has(s.vehicle._id.toString())) {
                const currentKm = s.vehicle.lastOdometer || 0;
                const kmRemaining = s.nextServiceKm - currentKm;
                console.log(`- KM Remaining: ${kmRemaining}`);

                if (kmRemaining <= 500) {
                    console.log('- !!! CONDITION MET (<= 500)');
                    kmAlertedVehicles.add(s.vehicle._id.toString());
                    expiringAlerts.push({
                        type: 'Service',
                        identifier: s.vehicle.carNumber,
                        kmRemaining
                    });
                } else {
                    console.log('- (Not within threshold)');
                }
            } else {
                console.log('- (Skipped: No nextServiceKm or already alerted or no vehicle)');
            }
        });

        console.log('\nFinal Alerts:', JSON.stringify(expiringAlerts, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
debug();
