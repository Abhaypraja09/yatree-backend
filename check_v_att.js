const { MongoClient } = require('mongodb');
const uri = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function check() {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('taxi-fleet');
    const v = await db.collection('vehicles').findOne({ carNumber: 'RJ-27-TA-6168' });
    const attendance = await db.collection('attendances').find({ vehicle: v._id }).sort({ createdAt: -1 }).limit(5).toArray();
    console.log('Attendance Records for 6168:');
    attendance.forEach(a => {
        console.log(`- Date: ${a.date}, PunchIn: ${a.punchIn?.km}, PunchOut: ${a.punchOut?.km}, Status: ${a.status}`);
    });
    await client.close();
}
check();
