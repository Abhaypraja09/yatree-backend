require('dotenv').config();
const mongoose = require('mongoose');

async function dropMobileIndex() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to DB');
        const db = mongoose.connection.db;
        await db.collection('users').dropIndex('mobile_1');
        console.log('Successfully dropped mobile_1 index');
    } catch (err) {
        console.error('Error dropping index:', err.message);
    } finally {
        mongoose.disconnect();
    }
}

dropMobileIndex();
