const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('fs');

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
const staffRoutes = require('./routes/staffRoutes');
const warrantyRoutes = require('./routes/warrantyRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/warranty', warrantyRoutes);

app.get('/api/db-check', async (req, res) => {
    const status = mongoose.connection.readyState;
    const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
    res.json({
        status: states[status],
        readyState: status
    });
});

// --- FRONTEND DEPLOYMENT LOGIC ---
const distPath = path.resolve(__dirname, '../dist');
const finalPath = distPath;

console.log('--- SERVER DEPLOYMENT INFO ---');
console.log('Current Dir:', __dirname);
console.log('Serving Frontend From:', finalPath);
console.log('------------------------------');

// Serve uploads folder
const uploadsPath = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath, {
    maxAge: '7d' // Cache uploaded files for 7 days
}));

// Serve static assets (JS, CSS, images) with long-term caching
// Safe because Vite adds content hash to filenames (e.g. index-CA8Jt-iv.js)
app.use('/assets', express.static(path.join(finalPath, 'assets'), {
    maxAge: '1y', // Cache for 1 year — safe due to hash in filename
    immutable: true
}));

// Serve other static files (logos, icons) with moderate caching
app.use(express.static(finalPath, {
    maxAge: '1h',
    etag: true,
    index: false // Don't auto-serve index.html here, we handle it below
}));

// Catch-all for React/Vite routing — NO cache on index.html
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.includes('.')) {
        return next();
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(finalPath, 'index.html'), (err) => {
        if (err) {
            res.status(500).send('<h1>Server is Live</h1><p>Frontend files are not found in the dist folder. Please check deployment.</p>');
        }
    });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;