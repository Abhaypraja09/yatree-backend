const mongoose = require('mongoose');
const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const run = async () => {
    try {
        await mongoose.connect(latestAtlasURI);
        const Attendances = mongoose.connection.db.collection('attendances');
        const abhayId = new mongoose.Types.ObjectId('698b03eb6bd90f103e7c9abc');

        // Get today's attendance
        const today = new Date().toISOString().split('T')[0];
        // Regex for date match if stored as string, or range if stored as Date
        // Based on schema, date is String YYYY-MM-DD
        const att = await Attendances.findOne({ driver: abhayId, date: "2026-02-19" });

        if (att) {
            console.log('--- Attendance Record ---');
            console.log(`ID: ${att._id}`);
            console.log(`Parking Array: ${JSON.stringify(att.parking)}`);
            console.log(`Pending Expenses: ${JSON.stringify(att.pendingExpenses)}`);
            console.log(`PunchOut Data: ${JSON.stringify(att.punchOut)}`);

            if (att.parking) {
                const total = att.parking.reduce((sum, p) => sum + (p.amount || 0), 0);
                console.log(`Total Parking in Array: ${total}`);
            }
        } else {
            console.log('No attendance found for Abhay today (2026-02-19).');
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
