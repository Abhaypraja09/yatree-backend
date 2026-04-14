const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');
const Company = require('./src/models/Company');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const u = await User.findOne({ username: 'kavishuser1' });
        const c = await Company.findById(u.company);
        
        console.log(`User: ${u.username}`);
        console.log(`- Company ID in User: ${u.company}`);
        console.log(`- Company Name: ${c?.name}`);
        
        const allCompanies = await Company.find({});
        console.log(`Available Companies:`);
        allCompanies.forEach(comp => {
            console.log(`- ${comp._id}: ${comp.name}`);
        });
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
