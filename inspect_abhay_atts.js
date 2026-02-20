const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const abhay = await mongoose.connection.db.collection('users').findOne({ mobile: '9660953135' });
        const atts = await mongoose.connection.db.collection('attendances').find({ driver: abhay._id }).toArray();
        console.log(`Found ${atts.length} attendance for Abhay`);
        atts.forEach(a => {
            console.log(`Date: ${a.date}, Wage: ${a.dailyWage}, Status: ${a.status}`);
            console.log(`Raw keys: ${Object.keys(a).join(', ')}`);
        });
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
