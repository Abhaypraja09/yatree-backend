const mongoose = require('mongoose');
const fs = require('fs');

mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true').then(async () => {
    const Vehicle = require('./src/models/Vehicle');
    const vehs = await Vehicle.find();
    let csv = 'CarNumber,Date,Amount,Method,Remarks,TransactionId\n';
    
    vehs.forEach(v => {
        if (v.fastagHistory && v.fastagHistory.length > 0) {
            v.fastagHistory.forEach(f => {
                csv += `${v.carNumber},${f.date},${f.amount},${f.method},"${f.remarks || ''}","${f.transactionId || ''}"\n`;
            });
        }
    });
    
    fs.writeFileSync('fastag_full_backup.csv', csv);
    console.log('Saved 154 entries to fastag_full_backup.csv');
    process.exit(0);
});
