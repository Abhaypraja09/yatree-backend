const { MongoClient, ObjectId } = require('mongodb');
const uri = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function check() {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('taxi-fleet');
    const v = await db.collection('vehicles').findOne({ carNumber: 'RJ-27-TA-6168' });
    const m = await db.collection('maintenances').find({ vehicle: v._id, status: 'Completed' }).sort({ createdAt: -1 }).toArray();
    console.log('Vehicle:', v.carNumber, 'Odo:', v.lastOdometer);
    console.log('Maintenance Records:', JSON.stringify(m.map(r => ({ next: r.nextServiceKm, cur: r.currentKm, date: r.billDate })), null, 2));
    await client.close();
}
check();
