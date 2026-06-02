const mongoose = require('mongoose');

mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true').then(async () => {
    const Attendance = require('./src/models/Attendance');
    const atts = await Attendance.find().sort({ _id: -1 }).limit(10);
    console.log('Last 10 Attendances:');
    atts.forEach(a => {
        console.log(`ID: ${a._id}, Date: ${a.date}, PunchInTime: ${a.punchIn?.time}, CreatedAt: ${a.createdAt}`);
    });
    process.exit(0);
});
