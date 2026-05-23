const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MaintenanceSchema = new mongoose.Schema({}, { strict: false });
const Maintenance = mongoose.model('Maintenance', MaintenanceSchema);

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const start = new Date('2026-04-01');
    const recs = await await mongoose.connection.db.collection('maintenances').find({ 
        billDate: { $gte: start } 
    }).toArray();

    const serviceRegex = /wash|washing|cleaning|tissue|water|mask|sanitizer|kapda/i;

    recs.forEach(r => {
        const searchStr = `${r.maintenanceType || ''} ${r.category || ''} ${r.description || ''}`.toLowerCase();
        const isService = serviceRegex.test(searchStr);
        console.log(`Date: ${r.billDate.toISOString().split('T')[0]} | Amt: ${r.amount} | Type: ${r.maintenanceType} | Cat: ${r.category} | Desc: ${r.description} | Filtered: ${isService}`);
    });
    
    const filtered = recs.filter(r => {
        const searchStr = `${r.maintenanceType || ''} ${r.category || ''} ${r.description || ''}`.toLowerCase();
        return !serviceRegex.test(searchStr);
    });

    console.log('Total Filtered Amt:', filtered.reduce((s, r) => s + (Number(r.amount) || 0), 0));
    console.log('Total Filtered Count:', filtered.length);

    process.exit();
}

check().catch(console.error);
