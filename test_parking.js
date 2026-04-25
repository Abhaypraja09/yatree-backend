const mongoose = require('mongoose');
require('dotenv').config();
const Parking = require('./src/models/Parking');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    try {
        const parking = await Parking.find({ company: '698ac8b01587e01651a49443' }).lean();
        const drivers = await User.find({ company: '698ac8b01587e01651a49443', role: 'Driver' }).lean();
        
        const mapped = parking.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 25).map(p => ({ 
            driver: drivers.find(d => d._id.toString() === p.driverId?.toString())?.name || p.driver, 
            amount: p.amount, 
            date: p.date 
        }));
        
        console.log("Recent Parking Data:");
        console.log(JSON.stringify(mapped, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});
