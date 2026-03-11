const mongoose = require('mongoose');

async function check() {
    await mongoose.connect('mongodb://127.0.0.1:27017/taxi-crm');
    const db = mongoose.connection.db;
    
    const atts = await db.collection('attendances').find().sort({createdAt: -1}).limit(5).toArray();
    console.log("LATEST ATTENDANCES:");
    atts.forEach(a => {
        console.log(`ID: ${a._id}, Date: ${a.date}, Status: ${a.status}`);
        if (a.pendingExpenses) {
            console.log(`  pendingExpenses length: ${a.pendingExpenses.length}`);
            console.log(`  pendingExpenses: ${JSON.stringify(a.pendingExpenses)}`);
        } else {
            console.log(`  NO pendingExpenses field`);
        }
        if (a.punchOut) {
            console.log(`  punchOut details: ${JSON.stringify(a.punchOut)}`);
        }
        if (a.fuel) {
            console.log(`  fuel details: ${JSON.stringify(a.fuel)}`);
        }
        if (a.parking) {
            console.log(`  parking legacy details: ${JSON.stringify(a.parking)}`);
        }
    });

    // Check maintenances
    const maints = await db.collection('maintenances').find().sort({createdAt: -1}).limit(2).toArray();
    console.log("LATEST MAINTENANCES:", JSON.stringify(maints, null, 2));
    
    process.exit(0);
}
check();
