const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function checkFields() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const vehicles = await mongoose.connection.db.collection('vehicles').find({}).toArray();
        console.log(`Checking ${vehicles.length} vehicles...`);
        
        let found = 0;
        vehicles.forEach(v => {
            const keys = Object.keys(v);
            const fastagKeys = keys.filter(k => k.toLowerCase().includes('fastag'));
            if (fastagKeys.length > 0) {
                fastagKeys.forEach(k => {
                    const val = v[k];
                    if (Array.isArray(val) && val.length > 0) {
                        console.log(`Vehicle ${v.carNumber} has field '${k}' with ${val.length} entries`);
                        found++;
                        // Show first entry date
                        console.log(`  First entry: ${val[0].date}, Amount: ${val[0].amount}`);
                    }
                });
            }
        });
        console.log(`Finished. Found ${found} vehicles with non-empty Fastag history.`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkFields();
