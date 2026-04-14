const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const fullMerge = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        // IDs
        const masterId = new mongoose.Types.ObjectId('698ac8b01587e01651a49443'); // Yatree Master
        const abhayId = new mongoose.Types.ObjectId('69caf340162fc71dc07307d1'); // Abhay Isolated Tenant

        console.log('Merging all Yatree data into Master ID:', masterId);

        // 1. All Collections to Audit
        const list = await db.listCollections().toArray();
        const collections = list.map(c => c.name);
        
        // Collections that SHOULD have a 'company' field (Skip companies/tenants/users)
        const targetCollections = collections.filter(c => !['companies', 'tenants', 'users'].includes(c));

        // Source IDs (Everything that is currently orphaned or pointed to Abhay but shouldn't be)
        // Actually, we'll just move Everything to Yatree, then RE-ISOLATE Abhay's admin.
        
        for (const col of targetCollections) {
            // We want to be careful: If a record ALREADY has 'abhayId', keep it there?
            // Actually, Abhay is supposed to have 0 records right now.
            // So we'll move ANY record that is with Abhay TO Yatree.
            const result = await db.collection(col).updateMany(
                { company: abhayId },
                { $set: { company: masterId } }
            );
            console.log(`Updated ${result.modifiedCount} records in ${col} (Abhay -> Yatree).`);

            // Also move records with null company to Yatree (orphan data recovery)
            const orphans = await db.collection(col).updateMany(
                 { company: null },
                 { $set: { company: masterId } }
            );
            console.log(`Updated ${orphans.modifiedCount} orphan records in ${col}.`);
        }

        // 2. Fix Users
        // Move ALL users from Abhay to Yatree EXCEPT the new Abhay Admin
        const moveUsers = await db.collection('users').updateMany(
            { company: abhayId, username: { $ne: 'abhay.superx@texi.com' } },
            { $set: { company: masterId } }
        );
        console.log(`Moved ${moveUsers.modifiedCount} user accounts back to Yatree.`);

        // Ensure Abhay Admin is pointing to Abhay Co
        await db.collection('users').updateOne(
            { username: 'abhay.superx@texi.com' },
            { $set: { company: abhayId } }
        );
        console.log('Abhay Admin verified with Abhay Co.');

        console.log('--- COMPREHENSIVE MERGE FINISHED ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fullMerge();
