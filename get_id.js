const { MongoClient } = require('mongodb');
const uri = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function check() {
    const client = new MongoClient(uri);
    await client.connect();
    const v = await client.db('taxi-fleet').collection('vehicles').findOne({ carNumber: 'RJ-27-TA-6168' });
    console.log('Vehicle Company ID:', v.company.toString());
    await client.close();
}
check();
