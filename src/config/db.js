const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const logToFile = (msg) => {
    try {
        const logPath = path.join(process.cwd(), 'server_debug.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] DB_DEBUG: ${msg}\n`);
    } catch (e) {
        console.error('Logging to file failed:', e);
    }
};

const connectDB = async (retryCount = 0) => {
    const maxRetries = 10;
    try {
        // PRIORITY 1: Environment Variable (Recommended)
        // PRIORITY 2: Hardcoded Standard Fallback (More reliable on Hostinger than +srv)
        // PRIORITY 3: Hardcoded +srv Fallback (Might fail on some Hostinger servers)

        let MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            // If you get "ENOTFOUND" on Hostinger, use the "Standard Connection String" from Atlas
            // It looks like mongodb://user:pass@node1:27017,node2:27017...
            MONGODB_URI = "mongodb+srv://prajapatmayank174_db_user:zR8eLMgAaiY9Aoyn@yatree-destination.x9f6z.mongodb.net/taxi-fleet?retryWrites=true&w=majority";
        }

        logToFile(`Attempting to connect to DB (Retry: ${retryCount})...`);
        console.log(`Attemping to connect to DB... (Attempt ${retryCount + 1})`);

        const conn = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 20000,
            socketTimeoutMS: 45000,
            family: 4, // Force IPv4 (Crucial for Hostinger)
            connectTimeoutMS: 20000,
            // These options help with stability
            heartbeatFrequencyMS: 10000,
            retryWrites: true
        });

        logToFile(`MongoDB Connected successfully: ${conn.connection.host}`);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Listen for connection drops
        mongoose.connection.on('error', err => {
            logToFile(`Mongoose connection error: ${err.message}`);
        });

        mongoose.connection.on('disconnected', () => {
            logToFile('Mongoose disconnected. Attempting to reconnect...');
            setTimeout(() => connectDB(0), 5000);
        });

    } catch (error) {
        logToFile(`DB Connection Error: ${error.message}`);
        console.error(`DB Connection Error: ${error.message}`);

        if (error.message.includes('ENOTFOUND')) {
            logToFile('CRITICAL: DNS Resolution failed. This is common on Hostinger with mongodb+srv. PLEASE use the Standard Connection String in your .env file.');
        }

        if (retryCount < maxRetries) {
            const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000); // Max delay 30s
            logToFile(`Retrying DB connection in ${delay / 1000}s...`);
            setTimeout(() => connectDB(retryCount + 1), delay);
        } else {
            logToFile('CRITICAL: Max retries reached. Database unavailable.');
        }
    }
};

module.exports = connectDB;
