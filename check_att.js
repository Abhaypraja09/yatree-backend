const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const Vehicle = require('./src/models/Vehicle');

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function checkAttendance() {
    try {
        await mongoose.connect(latestAtlasURI);
        const v = await Vehicle.findOne({ carNumber: 'RJ-27-TA-6168' });
        if (v) {
            console.log('Searching attendance for vehicle:', v._id);
            const latestAtt = await Attendance.findOne({ vehicle: v._id }).sort({ 'punchOut.time': -1, 'punchIn.time': -1 });
            if (latestAtt) {
                console.log('Latest Attendance:');
                console.log('Date:', latestAtt.date);
                console.log('PunchIn KM:', latestAtt.punchIn?.km);
                console.log('PunchOut KM:', latestAtt.punchOut?.km);
            } else {
                console.log('No attendance found');
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}
checkAttendance();
