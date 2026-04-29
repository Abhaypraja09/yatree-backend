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
app.use(compression({
    level: 6,        // Compression level (1=fast, 9=smaller, 6 is the sweet spot)
    threshold: 512,  // Compress anything over 512 bytes
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

// Keep-alive connections for faster repeated requests
app.use((req, res, next) => {
    res.set('Connection', 'keep-alive');
    res.set('Keep-Alive', 'timeout=30, max=100');
    next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- API ROUTES ---
console.log('--- REQUIRING ROUTES from', __dirname);
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
console.log('--- ADMIN ROUTES LOADED ---');
const driverRoutes = require('./routes/driverRoutes');
const staffRoutes = require('./routes/staffRoutes');

const aiRoutes = require('./routes/aiRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/staff', staffRoutes);

app.use('/api/ai', aiRoutes);

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

// Serve uploads folder
const uploadsPath = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath, { maxAge: '7d' }));

// Serve static assets (JS, CSS) with long-term caching
app.use('/assets', express.static(path.join(finalPath, 'assets'), {
    maxAge: '1y',
    immutable: true
}));

// Serve all other static files from dist root (logos, icons, manifest.json)
app.use(express.static(finalPath, {
    maxAge: '1d',
    etag: true
}));

// Catch-all for React/Vite routing
app.get('*', (req, res, next) => {
    // API requests should already be handled, but safety first
    if (req.path.startsWith('/api')) {
        return next();
    }

    // If it's a file request (contains a dot) and reached here, it means the file wasn't found in dist
    if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return next();
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
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
