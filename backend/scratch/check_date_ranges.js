const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function checkDateRanges() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collections = ['fuels', 'parkings', 'maintenances', 'bordertaxes', 'attendances'];
        
        for (const collName of collections) {
            const coll = mongoose.connection.db.collection(collName);
            const janApril = await coll.countDocuments({ 
                date: { $gte: new Date('2026-01-01').toISOString(), $lte: new Date('2026-04-30').toISOString() } 
            });
            const total = await coll.countDocuments({});
            console.log(`Collection ${collName}: Total ${total}, Jan-April (ISO) ${janApril}`);
            
            // Try with Date objects too
            const janAprilDate = await coll.countDocuments({ 
                date: { $gte: new Date('2026-01-01'), $lte: new Date('2026-04-30') } 
            });
            console.log(`Collection ${collName}: Jan-April (DateObj) ${janAprilDate}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkDateRanges();
