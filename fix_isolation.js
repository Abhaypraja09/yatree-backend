const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const fixIsolation = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        const yatree = await db.collection('companies').findOne({ name: 'YatreeDestination' });
        const abhay = await db.collection('companies').findOne({ name: 'Abhay SuperX Fleet' });

        console.log('Yatree ID:', yatree?._id);
        console.log('Abhay ID:', abhay?._id);

        if (!yatree || !abhay) {
            console.error('One or both companies not found!');
            process.exit(1);
        }

        // 🛡️ DATA RESTORATION:
        // All 771 vehicles are currently with Abhay.
        // We need to move them back to Yatree and ensure Abhay starts with 0.
        
        const vehCount = await db.collection('vehicles').countDocuments({ company: abhay._id });
        console.log(`Abhay currently has ${vehCount} vehicles.`);

        if (vehCount > 0) {
            const updateResult = await db.collection('vehicles').updateMany(
                { company: abhay._id },
                { $set: { company: yatree._id } }
            );
            console.log(`Moved ${updateResult.modifiedCount} vehicles back to Yatree.`);
        }

        // Same for Drivers
        const driverCount = await db.collection('users').countDocuments({ company: abhay._id, role: 'Driver' });
        if (driverCount > 0) {
             const updateDrivers = await db.collection('users').updateMany(
                { company: abhay._id, role: 'Driver' },
                { $set: { company: yatree._id } }
            );
            console.log(`Moved ${updateDrivers.modifiedCount} drivers back to Yatree.`);
        }

        console.log('--- ISOLATION FIX COMPLETED (Database Level) ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fixIsolation();
