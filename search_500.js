const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const collections = await mongoose.connection.db.listCollections().toArray();

        for (let col of collections) {
            const name = col.name;
            const has500 = await mongoose.connection.db.collection(name).find({
                $or: [
                    { amount: 500 },
                    { amount: "500" },
                    { totalEarned: 500 },
                    { advanceBalance: 500 }
                ]
            }).toArray();

            if (has500.length > 0) {
                console.log(`Collection [${name}] has ${has500.length} docs with 500`);
                has500.forEach(d => {
                    console.log(`- ID: ${d._id}, Keys: ${Object.keys(d).join(', ')}`);
                    if (d.remark || d.name) console.log(`  Detail: ${d.remark || d.name}`);
                });
            }
        }
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
