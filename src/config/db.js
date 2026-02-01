const mongoose = require('mongoose');
const dns = require('dns');

// Force using Google DNS to resolve MongoDB Atlas address on Hostinger
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    console.log('DNS servers set to Google');
} catch (e) {
    console.error('Failed to set DNS servers:', e.message);
}

const connectDB = async () => {
    try {
        // PRODUCTION OVERRIDE with more compatible format
        const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://prajapatmayank174_db_user:zR8eLMgAaiY9Aoyn@yatree-destination.x9f6z.mongodb.net/taxi-fleet?retryWrites=true&w=majority&appName=Yatree-Destination";

        console.log('Attemping to connect to DB with DNS fix...');

        const conn = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000, // Wait 10 seconds
            family: 4 // Force IPv4
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`DB Connection Error: ${error.message}`);
        throw error;
    }
};

module.exports = connectDB;
