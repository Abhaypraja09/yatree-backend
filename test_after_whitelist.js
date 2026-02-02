const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

// Try the standard connection string first to bypass SRV issues
const MONGODB_URI = "mongodb+srv://prajapatmayank174_db_user:Mayank%40123@yattridb.ojuesoz.mongodb.net/taxi-fleet?retryWrites=true&w=majority&appName=YattriDB";

console.log('--- DB CONNECTION TEST ---');
console.log('Time:', new Date().toISOString());

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    family: 4 // Force IPv4
})
    .then(() => {
        console.log('SUCCESS: Connected successfully to MongoDB Atlas!');
        process.exit(0);
    })
    .catch(err => {
        console.error('FAILURE: Connection failed.');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);

        if (err.message.includes('querySrv ETIMEOUT') || err.message.includes('ECONNREFUSED')) {
            console.log('\n--- DNS ISSUE DETECTED ---');
            console.log('Your network is having trouble resolving the MongoDB SRV record.');
            console.log('I will try the legacy (long) connection string next...');
        }
        process.exit(1);
    });
