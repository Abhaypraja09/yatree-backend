const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const Vehicle = require('./src/models/Vehicle');
    const Maintenance = require('./src/models/Maintenance');
    
    // Check June fastag history
    const vehicles = await Vehicle.find({});
    let juneFastags = 0;
    vehicles.forEach(v => {
        if (v.fastagHistory) {
            v.fastagHistory.forEach(h => {
                const d = new Date(h.date);
                if (d.getMonth() === 5 && d.getFullYear() === 2026) {
                    juneFastags++;
                }
            });
        }
    });

    // Check June maintenance (fuel, parking, etc.)
    const start = new Date(2026, 5, 1);
    const end = new Date(2026, 6, 1);
    const count = await Maintenance.countDocuments({
        billDate: { $gte: start, $lt: end }
    });

    console.log(`June Fastags: ${juneFastags}`);
    console.log(`June Maintenance: ${count}`);
    process.exit(0);
}
check();
