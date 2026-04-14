const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const Parking = mongoose.connection.db.collection('parkings');
        const docs = await Parking.find({
            $or: [
                { driver: /Abhay/i },
                { driverId: new mongoose.Types.ObjectId('698b03eb6bd90f103e7c9abc') }
            ]
        }).toArray();

        console.log(`Found ${docs.length} Parking documents for Abhay.`);
        docs.forEach(d => console.log(`- Amount: ${d.amount}, Date: ${d.date}, Driver: ${d.driver}`));

        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

run();
