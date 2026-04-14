const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const testAgg = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const id = new mongoose.Types.ObjectId('698ac8b01587e01651a49443');
        const db = mongoose.connection.db;

        console.log('--- TESTING VEHICLE COUNTS ---');
        const r = await db.collection('vehicles').aggregate([
            { $match: { company: id } }, 
            { $facet: { total: [{ $count: 'c' }], internal: [{ $match: { isOutsideCar: { $ne: true } } }, { $count: 'c' }] } }
        ]).toArray();
        console.log('Result:', JSON.stringify(r, null, 2));

        console.log('--- TESTING USER COUNTS ---');
        const d = await db.collection('users').find({ company: id, role: 'Driver' }).limit(5).toArray();
        console.log('Drivers found:', d.length);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

testAgg();
