const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const checkIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const collections = ['users', 'vehicles', 'attendances', 'fuels', 'parkings', 'maintenances', 'bordertaxes', 'advances', 'accidentlogs', 'partswarranties'];
        
        for (const colName of collections) {
            const indexes = await mongoose.connection.db.collection(colName).indexes();
            console.log(`\n--- Indexes for collection: ${colName} ---`);
            console.log(JSON.stringify(indexes, null, 2));
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error checking indexes:', error);
    }
};

checkIndexes();
