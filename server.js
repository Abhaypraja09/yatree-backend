/**
 * Hostinger Entry Point
 */
const dotenv = require('dotenv');
dotenv.config();

console.log('--- ROOT ENTRY ENV CHECK ---');
console.log('Available Env Keys:', Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('PASSWORD')));
console.log('--- ROOT ENTRY ENV CHECK END ---');

require('./src/server.js');
