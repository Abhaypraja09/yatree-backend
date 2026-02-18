const { MongoClient } = require('mongodb');
const uri = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function check() {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('taxi-fleet');

    const vehicles = await db.collection('vehicles').find({ carNumber: 'RJ-27-TA-6168' }).toArray();
    console.log('Vehicles found with 6168:', vehicles.length);
    vehicles.forEach(v => console.log(`- ID: ${v._id}, Odo: ${v.lastOdometer}, Company: ${v.company}`));

    const maintenances = await db.collection('maintenances').find({ nextServiceKm: { $gt: 0 } }).toArray();
    console.log('\nMaintenance records with nextServiceKm > 0:', maintenances.length);
    maintenances.forEach(m => {
        console.log(`- Vehicle Field: ${m.vehicle}, Next: ${m.nextServiceKm}, Status: ${m.status}`);
    });

    await client.close();
}
check();
