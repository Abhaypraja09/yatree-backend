const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // --- PRODUCTION OVERRIDE ---
        const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://prajapatmayank174_db_user:zR8eLMgAaiY9Aoyn@yatree-destination.x9f6z.mongodb.net/taxi-fleet?retryWrites=true&w=majority&appName=Yatree-Destination";
        // ---------------------------

        console.log('Attemping to connect to DB...');
        const conn = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        // process.exit(1); 
        throw error;
    }
};

module.exports = connectDB;
