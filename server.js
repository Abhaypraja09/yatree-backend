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

const diag = `--- DEPLOYMENT DIAGNOSTICS ---
Time: ${new Date().toISOString()}
CWD: ${process.cwd()}
__dirname: ${__dirname}
MONGODB_URI: ${!!process.env.MONGODB_URI}
PORT: ${process.env.PORT || 'Not specified (5000)'}
NODE_ENV: ${process.env.NODE_ENV}
-------------------------`;

console.log(diag);
try {
    fs.appendFileSync(path.join(__dirname, 'server_debug.log'), diag + '\n');
} catch (e) { }

require('./src/server.js');
