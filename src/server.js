const dotenv = require('dotenv');
// Version: 1.0.4 - Force Push for 503 Fix
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const { seed } = require('../scripts/seedAdmin');

// Connect to Database
connectDB().then(async () => {
    // Initial Seed
    await seed();
    console.log('Database connected and seeding completed.');
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
