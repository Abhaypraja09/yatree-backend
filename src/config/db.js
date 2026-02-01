const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('Attemping to connect to DB...');
        console.log('URI Type:', typeof process.env.MONGODB_URI);
        if (!process.env.MONGODB_URI) {
            console.error('CRITICAL ERROR: MONGODB_URI is not defined in environment variables!');
            throw new Error('MONGODB_URI is missing');
        }
        console.log('URI Value:', process.env.MONGODB_URI);

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        // process.exit(1); 
        throw error;
    }
};

module.exports = connectDB;
