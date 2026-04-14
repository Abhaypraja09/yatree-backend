const axios = require('axios');
const jwt = require('jsonwebtoken');

// Construct a fake token for kavishuser1 
// (or just disable auth temporarily in backend if I could... but better to use the script to call the controller directly).

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const { getDashboardStats } = require('./src/controllers/adminController');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const req = {
            params: { companyId: '69caf340162fc71dc07307d1' },
            query: { month: 3, year: 2026, bypassCache: 'true' },
            user: { _id: '69caf37c162fc71dc07307d8', role: 'Admin' } // kavishuser1
        };
        
        const res = {
            json: (data) => console.log('Response DATA:', JSON.stringify(data, null, 2)),
            status: (code) => { console.log('Response STATUS:', code); return res; }
        };
        
        await getDashboardStats(req, res);
        process.exit(0);
    } catch (e) {
        console.error('TEST ERROR:', e);
        process.exit(1);
    }
}
test();
