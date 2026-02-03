const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const logToFile = (msg) => {
    try {
        const logPath = path.join(__dirname, '../../server_debug.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] DB_DEBUG: ${msg}\n`);
    } catch (e) {
        console.error('Logging to file failed:', e);
    }
};

const connectDB = async (retryCount = 0) => {
    const maxRetries = 10;
    try {
        // NEW Cluster for info@yatreedestination.com
        const latestAtlasURI = "mongodb+srv://info_db_user:vIbU7VvaJ55fK7I3@cluster0.nj0snum.mongodb.net/taxi-fleet?retryWrites=true&w=majority&appName=Cluster0";
        let rawURI = process.env.MONGODB_URI || latestAtlasURI;

        // Clean URI: removes whitespace and anything after a '#' or space (common in copy-paste errors)
        const MONGODB_URI = rawURI.trim().split('#')[0].trim().split(' ')[0];

        logToFile(`Using URI from ${process.env.MONGODB_URI ? 'Environment Variable' : 'Hardcoded Fallback'}`);
        logToFile(`URI Preview: ${MONGODB_URI.substring(0, 20)}...[len: ${MONGODB_URI.length}]`);

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
