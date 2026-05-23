const mongoose = require('mongoose');
const Company = require('./backend/src/models/Company');
require('dotenv').config({ path: './backend/.env' });

async function checkCompany() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        const companies = await Company.find({});
        console.log('Companies:', JSON.stringify(companies, null, 2));
        mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkCompany();
