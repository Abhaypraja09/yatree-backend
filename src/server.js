const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const initCronJobs = require('./utils/cronJobs');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    initCronJobs();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[${new Date().toISOString()}] Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        const fs = require('fs');
        const path = require('path');
        try {
            fs.appendFileSync(path.join(process.cwd(), 'server_debug.log'), `[${new Date().toISOString()}] SERVER RESTARTED ON PORT ${PORT}\n`);
        } catch (e) { }
    });
});
