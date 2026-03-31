const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        
        console.log('--- VEHICLE COUNTS BY COMPANY ---');
        const vehicleCounts = await db.collection('vehicles').aggregate([
            { $group: { _id: '$company', count: { $sum: 1 } } }
        ]).toArray();
        console.log('Vehicle Counts:', vehicleCounts.length, 'groups found');
        vehicleCounts.forEach(c => console.log(`Co: ${c._id}, Cnt: ${c.count}`));

        console.log('--- ORPHAN DATA SCAN ---');
        const orphans = await db.collection('vehicles').countDocuments({
            $or: [ { company: null }, { company: { $exists: false } } ]
        });
        console.log('Orphan Vehicles:', orphans);

        const orphanDrivers = await db.collection('users').countDocuments({
            role: 'Driver',
            $or: [ { company: null }, { company: { $exists: false } } ]
        });
        console.log('Orphan Drivers:', orphanDrivers);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
