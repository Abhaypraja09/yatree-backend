const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        for (let col of collections) {
            const docs = await mongoose.connection.db.collection(col.name).find({
                $or: [
                    { remark: /Generated/i },
                    { remarks: /Generated/i },
                    { status: /Generated/i }
                ]
            }).toArray();
            if (docs.length > 0) {
                console.log(`Collection [${col.name}] has ${docs.length} docs with 'Generated'`);
                docs.forEach(d => console.log(`- ID: ${d._id}, Content: ${d.remark || d.remarks || 'No remark field'}`));
            }
        }
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
