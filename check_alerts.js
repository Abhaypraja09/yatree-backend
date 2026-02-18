const mongoose = require('mongoose');
const Maintenance = require('./src/models/Maintenance');
const Vehicle = require('./src/models/Vehicle');
require('dotenv').config();

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || latestAtlasURI);
        console.log('Connected to MongoDB');

        const vehicle = await Vehicle.findOne({ carNumber: 'RJ-27-TA-6168' });
        console.log('Vehicle:', JSON.stringify({
            carNumber: vehicle?.carNumber,
            lastOdometer: vehicle?.lastOdometer,
            _id: vehicle?._id
        }, null, 2));

        if (vehicle) {
            const maintenance = await Maintenance.find({ vehicle: vehicle._id }).sort({ createdAt: -1 });
            console.log('Maintenance Records Count:', maintenance.length);
            maintenance.forEach((m, i) => {
                console.log(`Record ${i + 1}:`, JSON.stringify({
                    date: m.billDate,
                    currentKm: m.currentKm,
                    nextServiceKm: m.nextServiceKm,
                    status: m.status,
                    createdAt: m.createdAt
                }, null, 2));
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

checkData();
