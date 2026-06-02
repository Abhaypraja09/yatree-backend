const mongoose = require('mongoose');
const fs = require('fs');

mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true').then(async () => {
    const Vehicle = require('./src/models/Vehicle');
    const vehs = await Vehicle.find();
    let backup = {};
    
    vehs.forEach(v => {
        if (v.fastagHistory && v.fastagHistory.length > 0) {
            backup[v._id.toString()] = { carNumber: v.carNumber, history: v.fastagHistory };
        }
    });
    
    fs.writeFileSync('fastag_full_backup.json', JSON.stringify(backup, null, 2));
    console.log('Saved JSON backup to fastag_full_backup.json');
    process.exit(0);
});
