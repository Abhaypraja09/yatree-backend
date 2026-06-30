const mongoose = require('mongoose');
mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true')
.then(async () => {
    const User = require('./src/models/User');
    const StaffAttendance = require('./src/models/StaffAttendance');
    const u = await User.findOne({name: /Chandni/});
    const { DateTime } = require('luxon');
    
    const sysStartDT = DateTime.fromISO('2026-03-01', { zone: 'Asia/Kolkata' }).startOf('day');
    const effectiveJoinDT = DateTime.fromJSDate(u.joiningDate, { zone: 'Asia/Kolkata' }).startOf('day');
    const realEffectiveJoinDT = effectiveJoinDT > sysStartDT ? effectiveJoinDT : sysStartDT;

    const agg = await StaffAttendance.aggregate([
        { $match: { 
            $or: [{ staff: u._id, date: { $gte: realEffectiveJoinDT.toFormat('yyyy-MM-dd'), $lt: '2026-05-30' } }], 
            status: { $in: ['present', 'half-day'] } 
        } },
        { $group: {
            _id: { staff: "$staff", date: "$date" },
            status: { $first: "$status" }
        }},
        { $group: {
            _id: "$_id.staff",
            presentCount: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
            halfDayCount: { $sum: { $cond: [{ $eq: ["$status", "half-day"] }, 0.5, 0] } }
        }}
    ]);
    console.log('Aggregate result:', JSON.stringify(agg));

    process.exit();
}).catch(e => {
    console.log('Error:', e);
    process.exit(1);
});
