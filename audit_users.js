const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        
        console.log('--- USER DISTRIBUTION ---');
        const userCounts = await db.collection('users').aggregate([
            { $group: { _id: '$company', count: { $sum: 1 } } }
        ]).toArray();
        
        const companies = await db.collection('companies').find({}).toArray();

        for (const c of userCounts) {
            const company = companies.find(comp => comp._id.toString() === c._id?.toString());
            console.log(`Co Name: ${company ? company.name : 'ORPHAN (' + c._id + ')'}, User Cnt: ${c.count}`);
            
            // Log some users from the UNKNOWN/Abhay if they look like they belong to Yatree
            if (company && company.name === 'Abhay SuperX Fleet') {
                const someUsers = await db.collection('users').find({ company: c._id }).limit(5).toArray();
                console.log('Users in Abhay:', someUsers.map(u => ({ name: u.name, mobile: u.mobile, role: u.role })));
            }
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
