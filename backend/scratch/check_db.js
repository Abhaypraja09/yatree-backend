const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function checkDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collections = ['vehicles', 'attendances', 'fuels', 'maintenances', 'advances'];
        
        for (const colName of collections) {
            const Model = mongoose.model(colName, new mongoose.Schema({}, { strict: false }), colName);
            const all = await Model.find({});
            
            const counts = {};
            all.forEach(doc => {
                const dateVal = doc.date || doc.billDate || doc.createdAt;
                if (!dateVal) return;
                const d = new Date(dateVal);
                const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
                counts[key] = (counts[key] || 0) + 1;
            });
            console.log(`--- ${colName} ---`);
            console.log(counts);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkDatabase();
