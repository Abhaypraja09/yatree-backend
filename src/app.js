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
const frontendPath = path.resolve(__dirname, '../../client/dist');
const backupPath = path.resolve(__dirname, '../dist');

// Determine which path exists (Local vs Hostinger)
const finalPath = fs.existsSync(frontendPath) ? frontendPath : backupPath;

console.log('Serving frontend from:', finalPath);

// Serve static files
app.use(express.static(finalPath, {
    maxAge: '1d',
    etag: true
}));

// Catch-all for React/Vite routing
app.get('*', (req, res, next) => {
    // If it's an API call or looks like a file (has a dot), don't serve index.html
    if (req.path.startsWith('/api') || req.path.includes('.')) {
        return next();
    }

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