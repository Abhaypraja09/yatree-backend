const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const User = require('./src/models/User');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const coId = new mongoose.Types.ObjectId('69caf340162fc71dc07307d1');
    const dIds = await User.find({ company: coId, role: 'Driver' }).distinct('_id');
    
    console.log('DRIVERS_IN_CO:', dIds.length);
    console.log('TOTAL_ATT:', await Attendance.countDocuments({ driver: { $in: dIds } }));
    console.log('COMPLETED_ATT:', await Attendance.countDocuments({ driver: { $in: dIds }, status: 'completed' }));
    console.log('MARCH_ATT_REGEX:', await Attendance.countDocuments({ driver: { $in: dIds }, status: 'completed', date: { $regex: /^2026-03/ } }));
    console.log('FEB_ATT_REGEX:', await Attendance.countDocuments({ driver: { $in: dIds }, status: 'completed', date: { $regex: /^2026-02/ } }));
    
    await mongoose.disconnect();
}
check();
