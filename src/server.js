const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const initCronJobs = require('./utils/cronJobs');

const PORT = process.env.PORT || 5000;

// Start listening immediately to prevent 503 errors during slow DB connection
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[${new Date().toISOString()}] Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    const fs = require('fs');
    const path = require('path');
    try {
        fs.appendFileSync(path.join(process.cwd(), 'server_debug.log'), `[${new Date().toISOString()}] SERVER RESTARTED ON PORT ${PORT}\n`);
    } catch (e) { }
});

// Connect to Database asynchronously
connectDB().then(() => {
    initCronJobs();
    console.log('Cron jobs and DB connection initialized.');
}).catch(err => {
    console.error('CRITICAL: DB Connection failed, but server is still listening:', err.message);
});
