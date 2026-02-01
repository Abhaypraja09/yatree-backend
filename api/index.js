const app = require('../src/app');
const connectDB = require('../src/config/db');

// Connect to Database (optimized for Vercel cold starts)
let isConnected = false;
const connect = async () => {
    if (isConnected) return;
    try {
        await connectDB();
        isConnected = true;
    } catch (err) {
        console.error('Vercel DB Connection Error:', err.message);
    }
};

// Middleware to ensure DB connection on every request
app.use(async (req, res, next) => {
    await connect();
    next();
});

// Export the app for Vercel Serverless Functions
module.exports = app;

