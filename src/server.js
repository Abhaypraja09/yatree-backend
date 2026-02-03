const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const initCronJobs = require('./utils/cronJobs');

const PORT = process.env.PORT || 5000;

console.log('--- Environment Check ---');
console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
console.log('MONGODB_URI present:', !!process.env.MONGODB_URI);
console.log('------------------------');

// Start listening immediately to prevent 503 errors during slow DB connection
const server = app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    try {
        const logPath = path.join(__dirname, '../server_debug.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] SERVER RESTARTED ON PORT ${PORT}\n`);
    } catch (e) {
        console.error('Failed to write to log file:', e.message);
    }
});

server.on('error', (err) => {
    console.error('SERVER ERROR:', err.message);
    const fs = require('fs');
    const path = require('path');
    try {
        fs.appendFileSync(path.join(__dirname, '../server_debug.log'), `[${new Date().toISOString()}] SERVER ERROR: ${err.message}\n`);
    } catch (e) { }
});

const { seed } = require('../scripts/seedAdmin');

// Connect to Database asynchronously
connectDB().then(async () => {
    initCronJobs();
    await seed();
    console.log('Cron jobs, DB connection, and Seeding initialized.');
}).catch(err => {
    console.error('CRITICAL: DB Connection failed, but server is still listening:', err.message);
});
