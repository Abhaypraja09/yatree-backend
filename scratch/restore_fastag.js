const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Vehicle = require('../src/models/Vehicle'); // Adjust if the path is different

async function restoreFastag() {
    try {
        console.log('Connecting to MongoDB...');
        // Fallback to Atlas URI if not in .env
        const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
        const uri = process.env.MONGODB_URI || latestAtlasURI; 
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const csvPath = path.join(__dirname, '../fastag_backup_may.csv');
        const csvData = fs.readFileSync(csvPath, 'utf8');
        const lines = csvData.split('\n').filter(line => line.trim() !== '');
        
        let restoredCount = 0;

        // Skip header (line 0)
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length < 4) continue;
            
            const dateStr = cols[0].trim();
            const carNumber = cols[1].trim();
            const amount = parseFloat(cols[2].trim());
            const method = cols[3].trim();
            const remarks = cols[4] ? cols[4].trim() : '';

            // Find vehicle
            const vehicle = await Vehicle.findOne({ carNumber });
            if (vehicle) {
                // Check if this history entry already exists to prevent duplicate restore
                const d = new Date(dateStr);
                const exists = vehicle.fastagHistory.some(h => {
                    const hd = new Date(h.date);
                    return hd.getTime() === d.getTime() && h.amount === amount;
                });

                if (!exists) {
                    vehicle.fastagHistory.push({
                        amount: amount,
                        date: d,
                        method: method,
                        remarks: remarks
                    });
                    vehicle.fastagBalance += amount;
                    await vehicle.save();
                    console.log(`Restored ${amount} for ${carNumber}`);
                    restoredCount++;
                } else {
                    console.log(`Entry for ${carNumber} on ${dateStr} already exists. Skipping.`);
                }
            } else {
                console.log(`Vehicle ${carNumber} not found.`);
            }
        }
        
        console.log(`Successfully restored ${restoredCount} Fastag entries!`);
    } catch (err) {
        console.error('Error during restore:', err);
    } finally {
        await mongoose.disconnect();
    }
}

restoreFastag();
