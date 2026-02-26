const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 1. Force load .env
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: true });
        console.log(`Loaded .env from: ${envPath}`);
    }
} catch (e) {
    console.error('Failed to load .env:', e.message);
}

// 2. Fallback for JWT_SECRET
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'yatree_secure_fallback_key_2024';
}

console.log('--- DEPLOYMENT DIAGNOSTICS ---');
console.log('Time:', new Date().toISOString());
console.log('PORT:', process.env.PORT || 'Not specified (5005)');
console.log('MONGODB_URI present:', !!process.env.MONGODB_URI);
console.log('-------------------------');

// 3. Robust Startup
try {
    require('./src/server.js');
} catch (error) {
    console.error('CRITICAL STARTUP ERROR:', error.stack || error);
    // Create an emergency server if the main one fails to load
    // This prevents 503 and shows the error instead
    const express = require('express');
    const emergencyApp = express();
    emergencyApp.get('*', (req, res) => {
        res.status(500).send(`<h1>Server Startup Error</h1><pre>${error.stack}</pre>`);
    });
    const port = process.env.PORT || 5005;
    emergencyApp.listen(port, () => {
        console.log('Emergency error-display server running on port', port);
    });
}
