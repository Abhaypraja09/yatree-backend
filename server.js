/**
 * Hostinger Entry Point
 * Force loads environment variables and starts the server
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 1. Force load .env from multiple possible locations on Hostinger
const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '.env'),
    path.join(process.cwd(), 'backend', '.env')
];

envPaths.forEach(p => {
    if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        console.log(`Loaded .env from: ${p}`);
    }
});

// 2. Fallback for JWT_SECRET if missing in Hostinger Dashboard
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'yatree_secure_fallback_key_2024';
}

console.log('--- DEPLOYMENT DIAGNOSTICS ---');
console.log('Current Work Dir (CWD):', process.cwd());
console.log('Script Dir (__dirname):', __dirname);
console.log('MONGODB_URI Detected:', !!process.env.MONGODB_URI);
console.log('--- END DIAGNOSTICS ---');

require('./src/server.js');
