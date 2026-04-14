const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        
        console.log('--- ALL COMPANIES ---');
        const companies = await db.collection('companies').find({}).toArray();
        companies.forEach(c => console.log(`ID: ${c._id}, Name: ${c.name}`));

        console.log('\n--- VEHICLE DISTRIBUTION ---');
        const vehicleCounts = await db.collection('vehicles').aggregate([
            { $group: { _id: '$company', count: { $sum: 1 } } }
        ]).toArray();
        
        for (const c of vehicleCounts) {
            const company = companies.find(comp => comp._id.toString() === c._id?.toString());
            console.log(`Co Name: ${company ? company.name : 'UNKNOWN (' + c._id + ')'}, Cnt: ${c.count}`);
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
