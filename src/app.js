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

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Taxi Fleet CRM API is running...' });
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const driverRoutes = require('./routes/driverRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);

// --- FRONTEND DEPLOYMENT LOGIC ---
const frontendPath = path.join(process.cwd(), 'dist');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    }
});
// ---------------------------------

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;