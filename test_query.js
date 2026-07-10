const mongoose = require('mongoose');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';

mongoose.connect(uri).then(async () => {
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    const ram = await User.findOne({ name: /Ram/i, driverType: 'Bus' });
    const driverIds = [ram._id];
    
    const startStr = '2026-06-01';
    const endStr = '2026-06-30';
    
    const attendanceQuery = {
        driver: { $in: driverIds },
        status: { $in: ['completed', 'incomplete'] },
        $or: [
            { date: { $gte: startStr, $lte: endStr } },
            {
                date: { $exists: false },
                'punchIn.time': { $gte: new Date('2026-06-01T00:00:00.000Z'), $lte: new Date('2026-06-30T23:59:59.999Z') }
            }
        ]
    };
    
    console.log("Query:", JSON.stringify(attendanceQuery, null, 2));
    const docs = await Attendance.find(attendanceQuery);
    console.log(`Found ${docs.length} docs matching the query.`);
    
    process.exit(0);
});
