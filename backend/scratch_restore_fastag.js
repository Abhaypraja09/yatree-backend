const mongoose = require('mongoose');
const fs = require('fs');

mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true').then(async () => {
    try {
        const Vehicle = require('./src/models/Vehicle');
        
        // Read the backup JSON file
        const backupData = JSON.parse(fs.readFileSync('fastag_full_backup.json', 'utf8'));
        
        let restoredCount = 0;
        let vehicleCount = 0;

        // Loop over the backup data and update each vehicle
        for (const [vehicleId, data] of Object.entries(backupData)) {
            const vehicle = await Vehicle.findById(vehicleId);
            if (vehicle) {
                // To avoid duplicate entries if some are already there, we can just replace the array
                // Or if we want to be safer, only push if it doesn't exist.
                // Since the user said Fastag is 0 now (wiped), it's safe to overwrite fastagHistory with backup
                vehicle.fastagHistory = data.history;
                await vehicle.save();
                restoredCount += data.history.length;
                vehicleCount++;
                console.log(`Restored ${data.history.length} fastag entries for Vehicle: ${data.carNumber}`);
            }
        }
        
        console.log(`\nSUCCESS: Restored ${restoredCount} Fastag entries across ${vehicleCount} vehicles.`);
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
});
