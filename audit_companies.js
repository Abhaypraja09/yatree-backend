const mongoose = require('mongoose');
const Company = require('./src/models/Company');
const Vehicle = require('./src/models/Vehicle');
const User = require('./src/models/User');
const config = { uri: "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true" };

const auditCompanies = async () => {
    try {
        await mongoose.connect(config.uri);
        const companies = await Company.find({});
        console.log(`Found ${companies.length} companies.`);
        
        for (const c of companies) {
            const vCount = await Vehicle.countDocuments({ company: c._id });
            const uCount = await User.countDocuments({ company: c._id });
            console.log(`Co: ${c.name} (${c._id}) -> Vehicles: ${vCount}, Users: ${uCount}`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

auditCompanies();
