const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const groups = await Vehicle.aggregate([
        { $group: { _id: '$company', count: { $sum: 1 } } }
    ]);
    console.log('GROUPS_START');
    for (const g of groups) {
        console.log(`CoId: ${g._id} -> ${g.count} Vehicles`);
    }
    console.log('GROUPS_END');
    await mongoose.disconnect();
}
check();
