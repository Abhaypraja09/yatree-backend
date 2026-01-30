const app = require('../src/app');
const connectDB = require('../src/config/db');

// Connect to Database
connectDB();

// Export the app for Vercel Serverless Functions
module.exports = app;
