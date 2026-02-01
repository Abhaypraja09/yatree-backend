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
        // PRIORITY: If env.MONGODB_URI exists and is NOT localhost, use it.
        // Otherwise, use the production Atlas URI to ensure it never fails on Hostinger.
        let MONGODB_URI = process.env.MONGODB_URI;

        const atlasURI = "mongodb+srv://prajapatmayank174_db_user:zR8eLMgAaiY9Aoyn@yatree-destination.x9f6z.mongodb.net/taxi-fleet?retryWrites=true&w=majority";

        if (!MONGODB_URI || MONGODB_URI.includes('localhost') || MONGODB_URI.includes('127.0.0.1')) {
            MONGODB_URI = atlasURI;
            logToFile('Using Production Atlas URI (Localhost detected or URI missing)');
        }

        logToFile(`Attempting to connect to DB... (Attempt: ${retryCount + 1})`);

        const conn = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 20000,
            socketTimeoutMS: 45000,
            family: 4, // Force IPv4 (Crucial for Hostinger)
            connectTimeoutMS: 20000,
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
            logToFile('CRITICAL: DNS Resolution failed. This is common on Hostinger with +srv. If this persists, replace Atlas SRV with Standard Connection String.');
        }

        if (retryCount < maxRetries) {
            const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000); // Exponential backoff
            logToFile(`Retrying DB connection in ${delay / 1000}s...`);
            setTimeout(() => connectDB(retryCount + 1), delay);
        } else {
            logToFile('CRITICAL: Max retries reached. Database unavailable.');
        }
    }
};

module.exports = connectDB;
