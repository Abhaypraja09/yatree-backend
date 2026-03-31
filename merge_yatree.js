const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mergeYatree = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        const allYatrees = await db.collection('companies').find({ name: /Yatree/i }).toArray();
        console.log('Found Yatree companies:', allYatrees.map(comp => ({ id: comp._id, name: comp.name })));

        if (allYatrees.length < 1) {
            console.error('No Yatree companies found!');
            process.exit(1);
        }

        // We'll use the ID that currently has the 771 vehicles (if possible)
        // or just the first one. 
        // I found in audit_data that 698ac8b01587e01651a49443 had them.
        const masterId = new mongoose.Types.ObjectId('698ac8b01587e01651a49443');
        const otherIds = allYatrees.filter(y => y._id.toString() !== masterId.toString()).map(y => y._id);

        console.log('Master ID:', masterId);
        console.log('Merging from:', otherIds);

        // 🚛 MOVE EVERYTHING TO MASTER
        // 1. Vehicles
        const vUpdate = await db.collection('vehicles').updateMany(
            { company: { $in: [...otherIds, null] } }, 
            { $set: { company: masterId } }
        );
        console.log(`Moved ${vUpdate.modifiedCount} vehicles to Master.`);

        // 2. Users (EXCEPT for Abhay)
        const uUpdate = await db.collection('users').updateMany(
            { company: { $in: otherIds }, username: { $ne: 'abhay.superx@texi.com' } },
            { $set: { company: masterId } }
        );
        console.log(`Moved ${uUpdate.modifiedCount} users to Master.`);

        // 3. Other models (Attendance, Fuel, etc.)
        const collections = ['attendances', 'fuels', 'advances', 'parkings', 'border_taxes', 'maintenances'];
        for (const col of collections) {
            const result = await db.collection(col).updateMany(
                { company: { $in: otherIds } },
                { $set: { company: masterId } }
            );
            console.log(`Updated ${result.modifiedCount} records in ${col}.`);
        }

        // 🚛 DELETE DUPLICATES
        if (otherIds.length > 0) {
            await db.collection('companies').deleteMany({ _id: { $in: otherIds } });
            console.log(`Deleted ${otherIds.length} duplicate company records.`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

mergeYatree();
