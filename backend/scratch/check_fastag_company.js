const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function checkFastagByCompany() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Company = mongoose.model('Company', new mongoose.Schema({ name: String }), 'companies');
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ 
            carNumber: String,
            company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
            fastagHistory: Array 
        }), 'vehicles');

        const vehicles = await Vehicle.find({ 
            fastagHistory: { $exists: true, $not: { $size: 0 } } 
        }).populate('company', 'name');

        console.log("Total vehicles with Fastag history:", vehicles.length);
        
        vehicles.forEach(v => {
            console.log(`Vehicle: ${v.carNumber}, Company: ${v.company?.name || 'Unknown'}`);
            v.fastagHistory.forEach(h => {
                const d = new Date(h.date);
                console.log(`  Date: ${h.date}, Amount: ${h.amount}`);
            });
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkFastagByCompany();
