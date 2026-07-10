const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(async () => {
    const User = require('./src/models/User');
    const drivers = await User.find({ name: { $regex: new RegExp('ram', 'i') } });
    console.log('Drivers containing RAM:', drivers.map(d => ({ _id: d._id, name: d.name, mobile: d.mobile, driverType: d.driverType, role: d.role })));
    
    const Attendance = require('./src/models/Attendance');
    for (const d of drivers) {
        const count = await Attendance.countDocuments({ driver: d._id, date: { $regex: /^2026-06-/ } });
        console.log(`Attendances for driver ${d._id} (${d.driverType}) in June:`, count);
    }
    process.exit(0);
});
