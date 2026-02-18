const mongoose = require('mongoose');
const Maintenance = require('./src/models/Maintenance');
const Attendance = require('./src/models/Attendance');
const Vehicle = require('./src/models/Vehicle');

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function syncOdometers() {
    try {
        await mongoose.connect(latestAtlasURI);
        console.log('Connected to MongoDB');

        const vehicles = await Vehicle.find({});
        console.log(`Syncing ${vehicles.length} vehicles...`);

        for (const v of vehicles) {
            let maxKm = 0;

            // Check maintenance
            const latestM = await Maintenance.findOne({ vehicle: v._id }).sort({ currentKm: -1 });
            if (latestM && latestM.currentKm > maxKm) {
                maxKm = latestM.currentKm;
            }

            // Check attendance (punch out)
            const latestAttOut = await Attendance.findOne({ vehicle: v._id }).sort({ 'punchOut.km': -1 });
            if (latestAttOut && latestAttOut.punchOut?.km > maxKm) {
                maxKm = latestAttOut.punchOut.km;
            }

            // Check attendance (punch in)
            const latestAttIn = await Attendance.findOne({ vehicle: v._id }).sort({ 'punchIn.km': -1 });
            if (latestAttIn && latestAttIn.punchIn?.km > maxKm) {
                maxKm = latestAttIn.punchIn.km;
            }

            if (maxKm > 0) {
                v.lastOdometer = maxKm;
                await v.save();
                console.log(`Updated ${v.carNumber} to ${maxKm} KM`);
            }
        }

        console.log('Sync completed');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

syncOdometers();
