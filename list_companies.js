const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const Company = require('./src/models/Company');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const companies = await Company.find({});
        console.log('All Companies:');
        for (const c of companies) {
            console.log(`- ${c.name} (${c._id})`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
