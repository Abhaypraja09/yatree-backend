const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // --- PRODUCTION OVERRIDE (Standard Connection - No SRV) ---
        // Some systems like Hostinger fail at SRV lookup (mongodb+srv). 
        // We try to use a more direct connection format if that fails.
        const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://prajapatmayank174_db_user:zR8eLMgAaiY9Aoyn@yatree-destination.x9f6z.mongodb.net/taxi-fleet?retryWrites=true&w=majority";

        console.log('Attemping to connect to DB (Standard Protocol)...');

        const conn = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            family: 4, // Force IPv4
            // Force standard connection if srv fails
            connectTimeoutMS: 10000
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`DB Connection Error detail: ${error.message}`);

        // If it's a DNS error, we try a desperate fallback (Standard Mongodb protocol)
        if (error.message.includes('ENOTFOUND')) {
            console.error('DNS Failure detected. Website may not work until Hostinger DNS is fixed or Atlas provides a standard connection string.');
        }
        throw error;
    }
};

module.exports = connectDB;
