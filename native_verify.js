const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function verify() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('taxi-fleet');
        const companyId = new ObjectId('6982e8b7d0b069a49db197b9');

        const maintenance = await db.collection('maintenances').find({
            company: companyId,
            nextServiceKm: { $gt: 0 },
            status: 'Completed'
        }).sort({ createdAt: -1 }).toArray();

        console.log('Maintenance records found:', maintenance.length);

        for (const s of maintenance) {
            const vehicle = await db.collection('vehicles').findOne({ _id: s.vehicle });
            if (vehicle) {
                const currentKm = vehicle.lastOdometer || 0;
                const kmRemaining = s.nextServiceKm - currentKm;
                console.log(`Car: ${vehicle.carNumber}, Cur: ${currentKm}, Next: ${s.nextServiceKm}, Rem: ${kmRemaining}`);
                if (kmRemaining <= 500) {
                    console.log('>>> ALERT TRIGGERED for', vehicle.carNumber);
                }
            }
        }
    } finally {
        await client.close();
    }
}
verify();
