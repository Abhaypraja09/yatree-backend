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
        // Updated URI with NEW password (Mayank@123 -> URL encoded as Mayank%40123)
        // Note: Special characters in passwords must be URL encoded.
        const latestAtlasURI = "mongodb+srv://prajapatmayank174_db_user:Mayank%40123@yattridb.ojuesoz.mongodb.net/taxi-fleet?retryWrites=true&w=majority&appName=YattriDB";

        let MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI || MONGODB_URI.includes('localhost') || MONGODB_URI.includes('127.0.0.1')) {
            MONGODB_URI = latestAtlasURI;
            logToFile('Using Latest Production Atlas URI (yattridb) with updated credentials');
        }

        logToFile(`Attempting to connect to DB... (Attempt: ${retryCount + 1})`);

        const conn = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 20000,
            socketTimeoutMS: 45000,
            family: 4, // Force IPv4
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

        if (error.message.includes('auth failed')) {
            logToFile('CRITICAL: Authentication failed. Check password and username in Atlas.');
        }

        if (retryCount < maxRetries) {
            const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000);
            logToFile(`Retrying DB connection in ${delay / 1000}s...`);
            setTimeout(() => connectDB(retryCount + 1), delay);
        } else {
            logToFile('CRITICAL: Max retries reached.');
        }
    }
};

module.exports = connectDB;
