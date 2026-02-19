const mongoose = require('mongoose');

const MONGO_URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const test = async () => {
    try {
        console.log('Connecting...');
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected!');

        console.log('Requiring User...');
        const User = require('./src/models/User');
        console.log('User model loaded');

        const count = await User.countDocuments();
        console.log(`User count: ${count}`);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

test();
