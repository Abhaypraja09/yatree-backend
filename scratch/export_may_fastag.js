const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function exportMayFastag() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ 
            carNumber: String,
            fastagHistory: Array 
        }), 'vehicles');

        const vehicles = await Vehicle.find({ fastagHistory: { $exists: true, $not: { $size: 0 } } });
        
        let report = "Date,Vehicle,Amount,Method,Remarks\n";
        let count = 0;

        for (const v of vehicles) {
            v.fastagHistory.forEach(h => {
                const d = new Date(h.date);
                if (d.getFullYear() === 2026 && d.getMonth() === 4) { // May
                    report += `${h.date},${v.carNumber},${h.amount},${h.method},${h.remarks}\n`;
                    count++;
                }
            });
        }

        const outputPath = path.join(__dirname, '../fastag_backup_may.csv');
        fs.writeFileSync(outputPath, report);
        console.log(`Backup created at: ${outputPath}`);
        console.log(`Total May entries backed up: ${count}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

exportMayFastag();
