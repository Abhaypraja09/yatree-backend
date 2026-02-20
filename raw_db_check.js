const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        // Count documents in each likely collection
        for (let name of ['advances', 'attendances', 'users']) {
            const count = await mongoose.connection.db.collection(name).countDocuments();
            console.log(`${name}: ${count}`);
        }

        // Find Abhay in the raw users collection
        const abhay = await mongoose.connection.db.collection('users').findOne({ name: /Abhay/i });
        if (abhay) {
            console.log(`Found Abhay ID: ${abhay._id}`);
            const advs = await mongoose.connection.db.collection('advances').find({ driver: abhay._id }).toArray();
            console.log(`Abhay Raw Advances: ${advs.length}`);
            advs.forEach(a => console.log(`- ${a.remark}`));
        } else {
            console.log('Abhay not found in raw users');
        }

        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
