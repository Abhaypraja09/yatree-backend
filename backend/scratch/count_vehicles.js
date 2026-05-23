const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function checkCompanies() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ company: mongoose.Schema.Types.ObjectId }), 'vehicles');
        const Company = mongoose.model('Company', new mongoose.Schema({ name: String }), 'companies');

        const counts = await Vehicle.aggregate([
            { $group: { _id: '$company', count: { $sum: 1 } } }
        ]);

        for (const c of counts) {
            const company = await Company.findById(c._id);
            console.log(`Company: ${company ? company.name : 'Unknown'} (${c._id}), Vehicles: ${c.count}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkCompanies();
