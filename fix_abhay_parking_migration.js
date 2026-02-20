const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const Attendances = mongoose.connection.db.collection('attendances');

        // Find Abhay's attendance for today
        const abhayId = new mongoose.Types.ObjectId('698b03eb6bd90f103e7c9abc');
        const todayStr = new Date().toISOString().split('T')[0]; // 2026-02-19

        const att = await Attendances.findOne({ driver: abhayId, date: "2026-02-19" });

        if (!att) {
            console.log('No attendance found for Abhay today.');
            process.exit();
        }

        console.log(`Found attendance: ${att._id}, Status: ${att.status}`);

        // Check for parking entries
        if (att.parking && att.parking.length > 0) {
            console.log(`Found ${att.parking.length} parking entries. Moving to Pending...`);

            const pendingItems = att.parking.map(p => ({
                type: 'parking',
                amount: p.amount,
                slipPhoto: p.slipPhoto || null,
                status: 'pending',
                paymentSource: 'Yatree Office',
                createdAt: new Date()
            }));

            await Attendances.updateOne(
                { _id: att._id },
                {
                    $set: {
                        parking: [],
                        'punchOut.tollParkingAmount': 0
                    },
                    $push: {
                        pendingExpenses: { $each: pendingItems }
                    }
                }
            );

            console.log('Migration successful. Parking cleared and moved to Pending.');
        } else {
            console.log('No parking entries in array to migrate.');
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
