const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const Attendances = mongoose.connection.db.collection('attendances');
        const docs = await Attendances.find({}).toArray();
        console.log(`Checking ${docs.length} attendance docs...`);
        for (let d of docs) {
            const str = JSON.stringify(d);
            if (str.includes('500') || str.includes('Generated')) {
                console.log(`Found suspicious Attendance [${d._id}] (${d.date} for driver ${d.driver})`);
                console.log(`Content: ${str.slice(0, 500)}...`);
            }
        }
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
