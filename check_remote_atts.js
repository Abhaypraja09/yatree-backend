const mongoose = require('mongoose');

async function check() {
    await mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true');
    const db = mongoose.connection.db;
    
    const atts = await db.collection('attendances').find().sort({createdAt: -1}).limit(6).toArray();
    console.log("LATEST ATTENDANCES:");
    atts.forEach(a => {
        console.log(`ID: ${a._id}, Driver: ${a.driver}, Date: ${a.date}, Status: ${a.status}`);
        if (a.pendingExpenses) {
            console.log(`  pendingExpenses length: ${a.pendingExpenses.length}`);
            console.log(`  pendingExpenses: ${JSON.stringify(a.pendingExpenses)}`);
        } else {
            console.log(`  NO pendingExpenses field`);
        }
        if (a.punchOut) {
            console.log(`  punchOut details: ${JSON.stringify(a.punchOut)}`);
        }
    });

    process.exit(0);
}
check();
