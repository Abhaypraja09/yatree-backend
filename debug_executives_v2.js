const mongoose = require('mongoose');
const User = require('./src/models/User');

const MONGO_URI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Find all Executives
        const executives = await User.find({ role: 'Executive' });
        console.log(`Found ${executives.length} Executives:`);
        executives.forEach(exec => {
            console.log(`- ID: ${exec._id}, Name: ${exec.name}, Mobile: ${exec.mobile}, Username: ${exec.username}, Password (hashed): ${exec.password ? 'Yes' : 'No'}`);
        });

        const users = await User.find({});
        console.log(`Total users: ${users.length}`);

        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();
