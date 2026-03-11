const mongoose = require('mongoose');

async function check() {
    await mongoose.connect('mongodb://127.0.0.1:27017/taxi-crm');
    const db = mongoose.connection.db;
    const atts = await db.collection('attendances').find({
        'pendingExpenses': { $exists: true, $not: { $size: 0 } }
    }).project({ _id: 1, driver: 1, date: 1, status: 1, pendingExpenses: 1 }).toArray();
    console.log(JSON.stringify(atts, null, 2));
    
    // Check if parking collection has any unapproved
    const parkings = await db.collection('parkings').find({}).toArray();
    console.log("Total Parkings:", parkings.length);
    
    // Check if maintenance collection has any driver entries
    const maints = await db.collection('maintenances').find({ createdBy: { $exists: true } }).toArray();
    console.log("Total Maintenances tracked:", maints.length);
    process.exit(0);
}
check();
