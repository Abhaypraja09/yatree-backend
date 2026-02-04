const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const compression = require('compression');

dotenv.config();

const app = express();

// 1. Performance Middlewares
app.use(compression()); // Compresses JS/CSS to load much faster
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API ROUTES ---
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const driverRoutes = require('./routes/driverRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);

app.get('/api/db-check', async (req, res) => {
    const status = mongoose.connection.readyState;
    const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
    res.json({
        status: states[status],
        readyState: status
    });
});

// --- FRONTEND DEPLOYMENT LOGIC ---
const frontendPath = path.join(__dirname, '../dist');

// Serve static files with caching
app.use(express.static(frontendPath, {
    maxAge: '1d', // Cache files for 1 day in the browser
    etag: true
}));

// Catch-all for React/Vite routing
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
        if (err) {
            res.status(500).send('<h1>Server is Live</h1><p>Frontend files are loading, please wait 1 minute and refresh.</p>');
        }
    });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;