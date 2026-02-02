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
        // Legacy URI is more robust for some networks (like Hostinger) and bypasses DNS SRV issues
        const latestAtlasURI = "mongodb://prajapatmayank174_db_user:Mayank12345@yattridb-shard-00-00.ojuesoz.mongodb.net:27017,yattridb-shard-00-01.ojuesoz.mongodb.net:27017,yattridb-shard-00-02.ojuesoz.mongodb.net:27017/taxi-fleet?ssl=true&replicaSet=atlas-z0yck0-shard-0&authSource=admin&retryWrites=true&w=majority";

        // ALWAYS use the latest URI to ensure we are using the new password,
        // unless you explicitly want to use an environment variable.
        // For now, we force this to fix the "bad auth" issue.
        const MONGODB_URI = latestAtlasURI;
        logToFile('Using Forced Legacy Production Atlas URI to ensure new credentials');

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

        let public_ip = 'unknown';
        try {
            const axios = require('axios');
            const ipRes = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            public_ip = ipRes.data.ip;
        } catch (e) { }

        logToFile(`Current Server Public IP: ${public_ip}`);

        if (error.message.includes('auth failed')) {
            logToFile('CRITICAL: Authentication failed. Check password and username in Atlas.');
        }

        if (error.message.includes('whitelist') || error.message.includes('ECONNREFUSED')) {
            logToFile(`HINT: Ensure IP ${public_ip} is whitelisted in MongoDB Atlas.`);
        }

        if (retryCount < maxRetries) {
            const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000);
            logToFile(`Retrying DB connection in ${delay / 1000}s... (Attempt ${retryCount + 1}/${maxRetries})`);
            setTimeout(() => connectDB(retryCount + 1), delay);
        } else {
            logToFile('CRITICAL: Max retries reached.');
        }
    }
};

module.exports = connectDB;
