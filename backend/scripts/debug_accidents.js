const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const AccidentLog = require('../src/models/AccidentLog');

async function debug() {
    try {
        const uri = process.env.MONGODB_URI || "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const logs = await AccidentLog.find({});
        console.log(`Total Logs: ${logs.length}`);

        logs.forEach(l => {
            console.log(`- ${l.date.toISOString()} | Amt: ${l.amount} | Co: ${l.company}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
