const mongoose = require('mongoose');
const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ company: mongoose.Schema.Types.ObjectId }));

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function checkCompanies() {
    try {
        await mongoose.connect(latestAtlasURI);
        const stats = await mongoose.connection.db.collection('vehicles').aggregate([
            { $group: { _id: '$company', count: { $sum: 1 } } }
        ]).toArray();
        console.log('Companies:', JSON.stringify(stats, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
checkCompanies();
