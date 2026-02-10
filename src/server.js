const express = require('express');
console.log('Backend starting - Updated Feb 10 with Property Hub and Maintenance');
const dotenv = require('dotenv');
// Version: 1.0.5 - Enhanced Logging
const path = require('path');
// Try loading from default CWD first, then fallback to explicit path
const result = dotenv.config();
if (result.error) {
    console.log('Default .env load failed, trying explicit path...');
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

console.log('--- SERVER STARTUP ---');
console.log('Time:', new Date().toISOString());
console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
console.log('MONGODB_URI present:', !!process.env.MONGODB_URI);
console.log('PORT:', process.env.PORT);


const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const { seed } = require('../scripts/seedAdmin');

// Connect to Database
connectDB().then(async () => {
    // Initial Seed
    await seed();

    // Initialize Cron Jobs
    const initCronJobs = require('./utils/cronJobs');
    initCronJobs();

    console.log('Database connected, seeding completed, and Cron Jobs initialized.');
}).catch(err => console.error('DB Initial Error:', err.message));

// Start listening immediately
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Live URL: https://driver.yatreedestination.com`);
});

server.on('error', (err) => {
    console.error('SERVER ERROR:', err.message);
});

module.exports = server;
