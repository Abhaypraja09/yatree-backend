const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function syncFastagBalances() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ 
            carNumber: String,
            fastagBalance: Number,
            fastagHistory: Array 
        }), 'vehicles');

        const vehicles = await Vehicle.find({ fastagHistory: { $exists: true, $not: { $size: 0 } } });
        console.log(`Checking ${vehicles.length} vehicles...`);

        let updated = 0;
        for (const v of vehicles) {
            const historyTotal = v.fastagHistory.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
            if (v.fastagBalance !== historyTotal) {
                console.log(`Vehicle ${v.carNumber}: Balance mismatch! DB: ${v.fastagBalance}, Calculated: ${historyTotal}. Updating...`);
                v.fastagBalance = historyTotal;
                await v.save();
                updated++;
            }
        }
        console.log(`Sync completed. Updated ${updated} vehicles.`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

syncFastagBalances();
