/**
 * Hostinger Entry Point
 */
const path = require('path');
const dotenv = require('dotenv');

// Try loading from current directory and parent directory to be safe
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // Fallback to default behavior

console.log('--- ROOT ENTRY ENV CHECK ---');
console.log('CWD:', process.cwd());
console.log('__dirname:', __dirname);
console.log('Available Env Keys:', Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('PASSWORD')));
console.log('--- ROOT ENTRY ENV CHECK END ---');

require('./src/server.js');
