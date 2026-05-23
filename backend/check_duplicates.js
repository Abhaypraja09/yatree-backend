const mongoose = require('mongoose');
const Maintenance = require('./src/models/Maintenance');
const Vehicle = require('./src/models/Vehicle');

async function check9053() {
    try {
        await mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true');
        const v = await Vehicle.findOne({ carNumber: /9053/ });
        if (!v) {
            console.log('Vehicle 9053 not found');
            return;
        }
        
        const records = await Maintenance.find({ 
            vehicle: v._id, 
            status: { $ne: 'Cancelled' },
            $or: [
                { maintenanceType: /Regular Service/i }, 
                { category: /Alignment & Balancing/i }
            ] 
        });

        console.log(`\n--- ALL ACTIVE SERVICES FOR ${v.carNumber} ---`);
        if (records.length === 0) {
            console.log('No active records found.');
        }
        records.forEach(r => {
            console.log(`ID: ${r._id}`);
            console.log(`Type: ${r.maintenanceType}`);
            console.log(`NextServiceKm: ${r.nextServiceKm}`);
            console.log(`BillDate: ${r.billDate}`);
            console.log('---------------------------');
        });
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check9053();
