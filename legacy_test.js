const mongoose = require('mongoose');

// Standard connection string (Legacy style) to bypass SRV DNS issues
const legacyURI = "mongodb://prajapatmayank174_db_user:Mayank12345@yattridb-shard-00-00.ojuesoz.mongodb.net:27017,yattridb-shard-00-01.ojuesoz.mongodb.net:27017,yattridb-shard-00-02.ojuesoz.mongodb.net:27017/taxi-fleet?ssl=true&replicaSet=atlas-z0yck0-shard-0&authSource=admin&retryWrites=true&w=majority";

console.log('--- LEGACY CONNECTION TEST (Bypassing DNS) ---');

mongoose.connect(legacyURI, {
    serverSelectionTimeoutMS: 15000
})
    .then(() => {
        console.log('SUCCESS: Connected using Legacy URI!');
        process.exit(0);
    })
    .catch(err => {
        console.error('FAILURE: End of the road.');
        console.error('Details:', err.message);
        process.exit(1);
    });
