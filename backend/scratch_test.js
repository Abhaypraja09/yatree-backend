const mongoose = require('mongoose');
mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true').then(async () => {
    const Attendance = require('./src/models/Attendance');
    const atts = await Attendance.find({ date: { $regex: '^2026-06' } });
    console.log('June Attendances:', atts.length);
    if (atts.length > 0) {
        console.log('Sample June Date:', atts[0].date);
        console.log('Sample Fuel:', atts[0].fuel);
        console.log('Sample Parking:', atts[0].punchOut?.parkingPaidBy);
    }
    
    // Also check Fuel collection directly
    const Fuel = require('./src/models/Fuel');
    const fuels = await Fuel.find({ date: { $gte: new Date('2026-06-01') } });
    console.log('June Fuels directly:', fuels.length);

    process.exit(0);
});
