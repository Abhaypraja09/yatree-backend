const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const Maintenance = require('./src/models/Maintenance');
const Vehicle = require('./src/models/Vehicle');

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function simulateDashboard() {
    try {
        await mongoose.connect(latestAtlasURI);
        const companyId = '6982e88b7d0b069a49db197b9';
        const baseDate = DateTime.now().setZone('Asia/Kolkata').startOf('day');
        const alertThreshold = baseDate.plus({ days: 30 });

        const upcomingServices = await Maintenance.find({
            $or: [
                { company: new mongoose.Types.ObjectId(companyId) },
                { company: companyId }
            ],
            $or: [
                { nextServiceDate: { $lte: alertThreshold.toJSDate(), $gte: baseDate.minus({ days: 30 }).toJSDate() } },
                { nextServiceKm: { $gt: 0 } }
            ],
            status: 'Completed'
        }).populate('vehicle', 'carNumber lastOdometer').sort({ createdAt: -1 });

        console.log('UPCOMING_SERVICES_COUNT:', upcomingServices.length);

        const expiringAlerts = [];
        const kmAlertedVehicles = new Set();

        upcomingServices.forEach(s => {
            if (s.nextServiceKm && s.vehicle && !kmAlertedVehicles.has(s.vehicle._id.toString())) {
                const currentKm = s.vehicle.lastOdometer || 0;
                const kmRemaining = s.nextServiceKm - currentKm;

                console.log(`Checking ${s.vehicle.carNumber}: Current=${currentKm}, Next=${s.nextServiceKm}, Remainder=${kmRemaining}`);

                if (kmRemaining <= 500) {
                    kmAlertedVehicles.add(s.vehicle._id.toString());
                    expiringAlerts.push({
                        type: 'Service',
                        identifier: s.vehicle.carNumber,
                        documentType: `Service @ ${s.nextServiceKm} KM`,
                        expiryDate: null,
                        daysLeft: kmRemaining,
                        status: kmRemaining <= 0 ? 'KM OVERDUE' : 'KM UPCOMING',
                        currentKm: currentKm,
                        targetKm: s.nextServiceKm
                    });
                }
            }
        });

        console.log('EXPIRING_ALERTS:');
        console.log(JSON.stringify(expiringAlerts, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
simulateDashboard();
