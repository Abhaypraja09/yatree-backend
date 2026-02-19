const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const path = require('path');
const logPath = path.join(__dirname, 'test_login.log');
const fs = require('fs');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Find all Executives
        const executives = await User.find({ role: 'Executive' });
        console.log(`Found ${executives.length} Executives:`);
        executives.forEach(exec => {
            console.log(`- Name: ${exec.name}, Mobile: ${exec.mobile}, Username: ${exec.username}, Password (hashed): ${exec.password ? 'Yes' : 'No'}`);
            // Let's verify password if provided (dummy check)
            // We can't verify unless we know the password.
        });

        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();
