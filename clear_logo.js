const mongoose = require('mongoose');

const uri = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

mongoose.connect(uri)
    .then(async () => {
        const db = mongoose.connection.db;
        await db.collection('companies').updateMany({}, { $set: { logoUrl: '' } });
        console.log('Successfully cleared logoUrl for all companies');
        process.exit(0);
    })
    .catch(console.error);
