require('dotenv').config();
const mongoose = require('mongoose');
const Maintenance = require('./src/models/Maintenance');
const Vehicle = require('./src/models/Vehicle');
const { DateTime } = require('luxon');

async function testAlerts() {
    try {
        const uri = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
        await mongoose.connect(uri);
        console.log("Connected to DB");

        const actualTodayIST = DateTime.now().setZone('Asia/Kolkata').startOf('day');
        const alertThreshold = actualTodayIST.plus({ days: 30 });
        const baseDate = actualTodayIST;

        const carMaint = await Maintenance.find({}).populate('vehicle').lean();
        const records = carMaint.filter(m => m.vehicle && m.vehicle.carNumber === 'RJ-27-TA-9821').sort((a,b) => new Date(b.billDate) - new Date(a.billDate));
        
        console.log("Records for RJ-27-TA-9821:");
        records.slice(0, 5).forEach(r => {
            console.log(`Date: ${r.billDate}, Type: ${r.maintenanceType}, Category: ${r.category}, Next KM: ${r.nextServiceKm}, ID: ${r._id}`);
        });

        mongoose.disconnect();
    } catch (e) {
        console.error(e);
        mongoose.disconnect();
    }
}

testAlerts();
