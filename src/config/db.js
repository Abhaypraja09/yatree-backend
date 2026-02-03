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
        // NEW Fresh Cluster with yatree_admin
        // Password: Mayank8025 (Simple and stable)
        const latestAtlasURI = "mongodb+srv://yatree_admin:Mayank8025@cluster0.nj0snum.mongodb.net/taxi-fleet?retryWrites=true&w=majority&appName=Cluster0";
        let MONGODB_URI = (process.env.MONGODB_URI || latestAtlasURI).trim();

        logToFile(`Using URI from ${process.env.MONGODB_URI ? 'Environment Variable' : 'Hardcoded Fallback'}`);
        logToFile(`URI Preview: ${MONGODB_URI.substring(0, 30)}... [Length: ${MONGODB_URI.length}]`);

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
        const timestamp = new Date().toISOString();
        logToFile(`DB Connection Error [${timestamp}]: ${error.message}`);
        console.error(`DB Connection Error: ${error.message}`);

        let public_ip = 'unknown';
        try {
            const axios = require('axios');
            const ipRes = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            public_ip = ipRes.data.ip;
        } catch (e) { }

        logToFile(`Current Server Public IP: ${public_ip}`);

        // Add specific advice for the user in the logs
        if (error.message.includes('MongooseServerSelectionError') || error.message.includes('ECONNREFUSED')) {
            logToFile(`CRITICAL: Possible IP Whitelist issue. Please add ${public_ip} to MongoDB Atlas.`);
        }

        if (retryCount < maxRetries) {
            const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000);
            logToFile(`Retrying DB connection in ${delay / 1000}s... (Attempt ${retryCount + 1}/${maxRetries})`);
            setTimeout(() => connectDB(retryCount + 1), delay);
        } else {
            logToFile('CRITICAL: Max retries reached. Database connection failed repeatedly.');
        }
    }
};

module.exports = connectDB;
