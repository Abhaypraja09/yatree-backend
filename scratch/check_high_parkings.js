const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function checkHighAmounts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const parkings = await mongoose.connection.db.collection('parkings').find({ 
            date: { $gte: new Date('2026-01-01'), $lte: new Date('2026-04-30') } 
        }).toArray();

        console.log(`Checking ${parkings.length} parkings...`);
        for (const p of parkings) {
            if (p.amount >= 200) { // Fastag recharges are usually high
                console.log(`Date: ${p.date}, Amount: ${p.amount}, Remark: ${p.remark}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkHighAmounts();
