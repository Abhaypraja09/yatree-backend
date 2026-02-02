const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://prajapatmayank174_db_user:Mayank12345@yattridb.ojuesoz.mongodb.net/taxi-fleet?retryWrites=true&w=majority&appName=YattriDB";

console.log('--- FINAL CONNECTION TEST ---');
console.log('Attempting to connect with NEW password...');

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    family: 4
})
    .then(() => {
        console.log('SUCCESS: MongoDB connected perfectly with the new password!');
        process.exit(0);
    })
    .catch(err => {
        console.error('FAILURE: Still failing.');
        console.error('Error:', err.message);
        process.exit(1);
    });
