const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const advs = await mongoose.connection.db.collection('advances').find({}).toArray();
        console.log(`--- ALL ${advs.length} ADVANCES ---`);
        advs.forEach(a => {
            console.log(`ID: ${a._id}, Driver: ${a.driver} (${typeof a.driver}), Amt: ${a.amount}, Remark: "${a.remark}"`);
        });
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
