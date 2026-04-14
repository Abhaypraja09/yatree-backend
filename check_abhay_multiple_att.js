const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const Attendances = mongoose.connection.db.collection('attendances');
        const abhayId = new mongoose.Types.ObjectId('698b03eb6bd90f103e7c9abc');

        const docs = await Attendances.find({ driver: abhayId, date: "2026-02-19" }).toArray();
        console.log(`Found ${docs.length} attendance records for today.`);

        docs.forEach(d => {
            const arr = d.parking || [];
            const sum = arr.reduce((acc, p) => acc + (p.amount || 0), 0);
            console.log(`- ID: ${d._id}, Status: ${d.status}, Parking Array Sum: ${sum}`);
            console.log(`  Parking Items: ${JSON.stringify(arr)}`);
        });

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
