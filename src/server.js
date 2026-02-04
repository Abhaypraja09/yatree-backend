const dotenv = require('dotenv');
// Version: 1.0.4 - Force Push for 503 Fix
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to Database in the background
connectDB().catch(err => console.error('DB Background Error:', err.message));

// Start listening immediately
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('SERVER ERROR:', err.message);
});

module.exports = server;
