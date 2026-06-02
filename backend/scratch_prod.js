const mongoose = require('mongoose');
const { DateTime } = require('luxon');

mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true').then(async () => {
    const Vehicle = require('./src/models/Vehicle');
    const Attendance = require('./src/models/Attendance');

    const companyObjectId = new mongoose.Types.ObjectId('666da86fb7b3558fc95bb4f8'); // Yatree
    const from = '2026-06-01';
    const to = '2026-06-30';
    const isMonthlyMode = false;
    const isRangeMode = true;
    const targetDate = to;
    const baseDate = DateTime.fromFormat(targetDate, 'yyyy-MM-dd').setZone('Asia/Kolkata').startOf('day');
    const monthPrefix = isMonthlyMode ? 'nope' : baseDate.toFormat('yyyy-MM');

    const outFacet = await Vehicle.aggregate([
        { $match: { company: companyObjectId, isOutsideCar: true } },
        {
            $project: {
                month: { $substr: [{ $ifNull: ["$carNumber", ""] }, { $add: [{ $indexOfBytes: ["$carNumber", "#"] }, 1] }, 7] },
                amount: "$dutyAmount",
                isE: { $ne: [{ $ifNull: ["$eventId", null] }, null] }
            }
        },
        {
            $facet: {
                e: [
                    { $match: { month: monthPrefix, isE: true } },
                    { $group: { _id: null, t: { $sum: "$amount" } } }
                ]
            }
        }
    ]);
    
    console.log('outFacet:', JSON.stringify(outFacet));

    const monthStart = DateTime.fromISO(from, { zone: 'Asia/Kolkata' }).startOf('day').toJSDate();
    const monthEnd = DateTime.fromISO(to, { zone: 'Asia/Kolkata' }).endOf('day').toJSDate();
    const monthStartStr = DateTime.fromJSDate(monthStart).toFormat('yyyy-MM-dd');
    const monthEndStr = DateTime.fromJSDate(monthEnd).toFormat('yyyy-MM-dd');

    const mAtt = await Attendance.find({ company: companyObjectId, date: { $gte: monthStartStr, $lte: monthEndStr } }).lean();
    console.log('mAtt length:', mAtt.length);

    const fleetEventTotal = mAtt.filter(a => a.eventId).reduce((sum, a) => sum + (Number(a.dailyWage) || 0), 0);
    const monthlyEventTotal = (outFacet[0]?.e[0]?.t || 0) + fleetEventTotal;

    console.log('fleetEventTotal:', fleetEventTotal);
    console.log('monthlyEventTotal:', monthlyEventTotal);
    process.exit(0);
});
