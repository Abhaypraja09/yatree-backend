const mongoose = require('mongoose');

const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function globalSearch() {
    try {
        await mongoose.connect(latestAtlasURI);
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        console.log('Searching for 118903 or 118904...');

        for (const col of collections) {
            const name = col.name;
            const results = await db.collection(name).find({
                $or: [
                    { currentKm: { $in: [118903, 118904, '118903', '118904'] } },
                    { nextServiceKm: { $in: [118903, 118904, '118903', '118904'] } },
                    { km: { $in: [118903, 118904, '118903', '118904'] } },
                    { 'punchIn.km': { $in: [118903, 118904, '118903', '118904'] } },
                    { 'punchOut.km': { $in: [118903, 118904, '118903', '118904'] } }
                ]
            }).toArray();

            if (results.length > 0) {
                console.log(`Found ${results.length} matches in collection: ${name}`);
                results.forEach(r => console.log(JSON.stringify(r, null, 2)));
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
globalSearch();
