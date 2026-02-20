const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const abhayIdStr = '698b03eb6bd90f103e7c9abc';
        const advs = await mongoose.connection.db.collection('advances').find({
            $or: [
                { driver: abhayIdStr },
                { driver: new mongoose.Types.ObjectId(abhayIdStr) }
            ]
        }).toArray();
        console.log(`Abhay (${abhayIdStr}) has ${advs.length} advances in collection.`);
        advs.forEach(a => {
            console.log(`- Amt: ${a.amount}, Remark: "${a.remark}", ID: ${a._id}`);
        });
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
