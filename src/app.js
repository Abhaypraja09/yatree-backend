const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

const { errorHandler, notFound } = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();

const axios = require('axios');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Static Folder for Uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Geocoding Proxy to avoid CORS and 403 errors
app.get('/api/utils/geocode', async (req, res) => {
    const { lat, lon } = req.query;
    try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
            headers: { 'User-Agent': 'TaxiFleetCRM/1.0' }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching address' });
    }
});

const mongoose = require('mongoose');
let lastDbError = null;
if (mongoose.connection) {
    mongoose.connection.on('error', (err) => {
        lastDbError = err.message;
    });
}

app.get('/api/db-check', async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const mongoose = require('mongoose');
    const status = mongoose.connection.readyState;
    const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
    const uri = process.env.MONGODB_URI;

    let public_ip = 'Check disabled';
    try {
        const ipRes = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
        public_ip = ipRes.data.ip;
    } catch (e) { public_ip = 'Error fetching IP'; }

    res.json({
        status: states[status],
        readyState: status,
        error: lastDbError,
        env_uri_exists: !!uri,
        env_uri_preview: uri ? (uri.startsWith('mongodb+srv') ? 'Starts with mongodb+srv' : 'Standard Format (mongodb://)') : 'NOT FOUND',
        dot_env_exists: fs.existsSync(path.join(process.cwd(), '.env')),
        public_ip
    });
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const driverRoutes = require('./routes/driverRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);



// --- FRONTEND DEPLOYMENT LOGIC ---
const frontendPath = path.join(__dirname, '../dist');
app.use(express.static(frontendPath));

app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        next();
    }
});
// ---------------------------------

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;