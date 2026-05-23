const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function checkFastag() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ 
            carNumber: String,
            fastagHistory: Array 
        }), 'vehicles');

        const allVehicles = await Vehicle.find({ 
            fastagHistory: { $exists: true, $not: { $size: 0 } } 
        });

        console.log("Total vehicles with Fastag history (all):", allVehicles.length);
        allVehicles.forEach(v => {
            const janApril = v.fastagHistory.filter(h => {
                const d = new Date(h.date);
                return d.getFullYear() === 2026 && d.getMonth() < 4;
            });
            if (janApril.length > 0 || v.fastagHistory.length > 0) {
                console.log(`Vehicle ${v.carNumber} (Outside: ${v.isOutsideCar}) has ${v.fastagHistory.length} entries, ${janApril.length} in Jan-April`);
            }
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkFastag();
