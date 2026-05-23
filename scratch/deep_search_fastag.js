const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function deepSearch() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        for (const collInfo of collections) {
            const collName = collInfo.name;
            const coll = mongoose.connection.db.collection(collName);
            
            // Search in string fields or any field
            const results = await coll.find({
                $or: [
                    { remarks: /fastag/i },
                    { remark: /fastag/i },
                    { category: /fastag/i },
                    { description: /fastag/i },
                    { type: /fastag/i },
                    { method: /fastag/i },
                    { fastagHistory: { $exists: true, $not: { $size: 0 } } }
                ]
            }).limit(5).toArray();
            
            if (results.length > 0) {
                console.log(`Found ${results.length} (sample) in collection ${collName}`);
                results.forEach(r => {
                    console.log(`  _id: ${r._id}, Date: ${r.date}, Amount: ${r.amount || r.dutyAmount || r.totalAmount}`);
                });
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

deepSearch();
