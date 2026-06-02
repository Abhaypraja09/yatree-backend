const mongoose = require('mongoose');

mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true').then(async () => {
    const Attendance = require('./src/models/Attendance');
    const att = await Attendance.findById('6a1a6d3b46ad915cee683307');
    if (att) {
        console.log('Found Attendance in PROD DB:', att.date, att.status, att.fuel, att.punchOut?.time);
    } else {
        console.log('Not found in PROD DB either!');
    }
    process.exit(0);
});
