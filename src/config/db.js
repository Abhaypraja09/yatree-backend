const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const latestAtlasURI = "mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true";
        const MONGODB_URI = (process.env.MONGODB_URI || latestAtlasURI).trim();

        console.log('Attempting to connect to MongoDB...');

        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 100, // Handle up to 100 concurrent requests smoothly
            minPoolSize: 10,  // Keep 10 connections open and ready
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            serverSelectionTimeoutMS: 5000,
        });

        console.log('MongoDB Connected successfully');

    } catch (error) {
        console.error(`Status: DB Connection Error: ${error.message}`);
        // Don't exit the process, let the server stay alive (503 prevention)
    }
};

module.exports = connectDB;
