const mongoose = require('mongoose');

mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true').then(async () => {
    const Vehicle = require('./src/models/Vehicle');
    const vehs = await Vehicle.find();
    let totalFastag = 0;
    vehs.forEach(v => {
        if (v.fastagHistory && v.fastagHistory.length > 0) {
            totalFastag += v.fastagHistory.length;
        }
    });
    console.log('Total Fastag History Entries:', totalFastag);
    process.exit(0);
});
