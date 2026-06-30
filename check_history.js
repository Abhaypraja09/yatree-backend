const mongoose = require('mongoose');
const User = require('./src/models/User');
const StaffAttendance = require('./src/models/StaffAttendance');
const { DateTime } = require('luxon');

mongoose.connect('mongodb+srv://primary:Fleet2025%21@cluster0.o7imf.mongodb.net/yatree?retryWrites=true&w=majority')
.then(async () => {
    const s = await User.findOne({name: /Chandni/});
    console.log('User:', s.name, s._id, s.joiningDate);
    
    const searchStartDT = DateTime.fromObject({ year: 2026, month: 7, day: 1 }, { zone: 'Asia/Kolkata' }).minus({ days: 32 });
    const startStrQuery = searchStartDT.toFormat('yyyy-MM-dd');
    console.log('startStrQuery:', startStrQuery);
    
    const historicalAttStats = await StaffAttendance.aggregate([
        { $match: { staff: s._id, date: { $lt: startStrQuery } } },
        { $group: {
            _id: "$staff",
            presentCount: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
            halfDayCount: { $sum: { $cond: [{ $eq: ["$status", "half-day"] }, 0.5, 0] } }
        }}
    ]);
    console.log('historicalAttStats:', historicalAttStats);
    
    const firstAttStats = await StaffAttendance.aggregate([
        { $match: { staff: s._id } },
        { $group: { _id: "$staff", firstDate: { $min: "$date" } } }
    ]);
    console.log('firstAttStats:', firstAttStats);
    
    process.exit();
}).catch(console.error);
