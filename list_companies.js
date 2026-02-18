const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Company = require('./src/models/Company');

dotenv.config();

const listCompanies = async () => {
    try {
        const uri = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
        await mongoose.connect(uri);
        const companies = await Company.find({});
        console.log('Companies:');
        companies.forEach(c => console.log(`- ${c.name} (ID: ${c._id})`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

listCompanies();
