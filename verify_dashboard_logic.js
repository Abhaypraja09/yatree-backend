const mongoose = require('mongoose');
const { DateTime } = require('luxon');

// Re-defining models for the script
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

async function verifyDashboardLogic() {
    try {
        await mongoose.connect(latestAtlasURI);
        const companyId = '6982e88b7d0b069a49db197b9';
        const baseDate = DateTime.now().setZone('Asia/Kolkata').startOf('day');
        const alertThreshold = baseDate.plus({ days: 30 });

        // This is the EXACT query from adminController
        const upcomingServices = await Maintenance.find({
            company: companyId,
            $or: [
                { nextServiceDate: { $lte: alertThreshold.toJSDate(), $gte: baseDate.minus({ days: 30 }).toJSDate() } },
                { nextServiceKm: { $gt: 0 } }
            ],
            status: 'Completed'
        }).populate('vehicle').sort({ createdAt: -1 });

        console.log('Total Maintenance Records Found:', upcomingServices.length);

        const expiringAlerts = [];
        const kmAlertedVehicles = new Set();

        upcomingServices.forEach(s => {
            if (s.nextServiceKm && s.vehicle && !kmAlertedVehicles.has(s.vehicle._id.toString())) {
                const currentKm = s.vehicle.lastOdometer || 0;
                const kmRemaining = s.nextServiceKm - currentKm;

                console.log(`Vehicle ${s.vehicle.carNumber}: Cur=${currentKm}, Next=${s.nextServiceKm}, Rem=${kmRemaining}`);

                if (kmRemaining <= 500) {
                    kmAlertedVehicles.add(s.vehicle._id.toString());
                    expiringAlerts.push({
                        type: 'Service',
                        identifier: s.vehicle.carNumber,
                        documentType: `Service @ ${s.nextServiceKm} KM`,
                        status: kmRemaining <= 0 ? 'KM OVERDUE' : 'KM UPCOMING',
                        currentKm: currentKm,
                        targetKm: s.nextServiceKm,
                        kmLeft: kmRemaining
                    });
                }
            }
        });

        console.log('EXPIRING ALERTS JSON:');
        console.log(JSON.stringify(expiringAlerts, null, 2));

    } catch (err) {
        console.error('Logic Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

verifyDashboardLogic();
