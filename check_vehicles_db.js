const mongoose = require('mongoose');
const Vehicle = require('./src/models/Vehicle');
const Company = require('./src/models/Company');

const MONGODB_URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

async function checkVehicles() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected');

        const companies = await Company.find({});
        console.log('Total Companies:', companies.length);

        for (const company of companies) {
            const internalCount = await Vehicle.countDocuments({ company: company._id, isOutsideCar: { $ne: true } });
            const outsideCount = await Vehicle.countDocuments({ company: company._id, isOutsideCar: true });
            if (internalCount > 0 || outsideCount > 0) {
                console.log(`Company: ${company.name} (${company._id}) - Internal: ${internalCount}, Outside: ${outsideCount}`);
            }
            
            if (company.name.includes('Yatree')) {
                 const vehicles = await Vehicle.find({ company: company._id, isOutsideCar: { $ne: true } }).limit(5);
                 console.log(`Yatree Internal Vehicles:`, vehicles.map(v => v.carNumber));
            }
        }

        mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkVehicles();
