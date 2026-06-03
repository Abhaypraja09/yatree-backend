const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const db = mongoose.connection.db;
    const companyId = new mongoose.Types.ObjectId('698ac8b01587e01651a49443');

    // Mongoose Aggregation
    const aggResult = await db.collection('vehicles').aggregate([
        { $match: { company: companyId, isOutsideCar: true } }, 
        { $project: { 
            carNumber: 1,
            month: { $substr: [{ $ifNull: ["$carNumber", ""] }, { $add: [{ $indexOfBytes: ["$carNumber", "#"] }, 1] }, 7] }, 
            isBuy: { $eq: [{ $ifNull: ["$transactionType", "Buy"] }, "Buy"] }, 
            amount: "$dutyAmount", 
            eventId: 1,
            eventIdType: { $type: "$eventId" },
            isE: { $gt: [{ $strLenCP: { $toString: { $ifNull: ["$eventId", ""] } } }, 10] } 
        } }, 
        { $facet: { 
            e: [{ $match: { month: "2026-06", isE: true } }], 
            o: [{ $match: { month: "2026-06", isE: false, isBuy: true } }] 
        } }
    ]).toArray();

    console.log('Agg:', JSON.stringify(aggResult, null, 2));

    const event1 = await db.collection('events').findOne({ _id: new mongoose.Types.ObjectId("69f58e67a1e3baae29ba9787") });
    const event2 = await db.collection('events').findOne({ _id: new mongoose.Types.ObjectId("6a1fb89d5d76fcf3232bd514") });

    console.log('Event 1:', JSON.stringify(event1, null, 2));
    console.log('Event 2:', JSON.stringify(event2, null, 2));

    process.exit(0);
}

run().catch(console.error);
