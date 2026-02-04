const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const latestAtlasURI = "mongodb+srv://yatree_admin:Mayank123@cluster0.iuq9w0n.mongodb.net/taxi-fleet?retryWrites=true&w=majority";
        const MONGODB_URI = (process.env.MONGODB_URI || latestAtlasURI).trim();

        console.log('Attempting to connect to MongoDB...');

        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });

        console.log('MongoDB Connected successfully');

    } catch (error) {
        console.error(`Status: DB Connection Error: ${error.message}`);
        // Don't exit the process, let the server stay alive (503 prevention)
    }
};

module.exports = connectDB;
