const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');

const cleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const nameToDelete = "Suresh Kumar Patel (Restored)";
        
        // Find all records with this name that are blocked
        const duplicates = await User.find({ 
            name: nameToDelete, 
            status: 'blocked' 
        });

        console.log(`Found ${duplicates.length} blocked duplicates for "${nameToDelete}"`);

        if (duplicates.length > 0) {
            const result = await User.deleteMany({ 
                name: nameToDelete, 
                status: 'blocked' 
            });
            console.log(`Successfully deleted ${result.deletedCount} records.`);
        }

        // Also check for other duplicates and clean them if they are blocked
        const allDuplicates = await User.aggregate([
            { $group: { _id: { name: "$name", mobile: "$mobile" }, count: { $sum: 1 }, ids: { $push: "$_id" }, statuses: { $push: "$status" } } },
            { $match: { count: { $gt: 1 } } }
        ]);

        console.log(`Found ${allDuplicates.length} groups of duplicates in total.`);

        for (const group of allDuplicates) {
            console.log(`Processing group: ${group._id.name} (${group._id.mobile}) - ${group.count} records`);
            
            // If there's at least one 'active' record, we can safely delete the 'blocked' ones
            if (group.statuses.includes('active')) {
                const blockedIds = await User.find({
                    name: group._id.name,
                    mobile: group._id.mobile,
                    status: 'blocked'
                }).select('_id');
                
                if (blockedIds.length > 0) {
                    const idsToDelete = blockedIds.map(d => d._id);
                    const delRes = await User.deleteMany({ _id: { $in: idsToDelete } });
                    console.log(`  Deleted ${delRes.deletedCount} blocked duplicates.`);
                }
            }
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
};

cleanup();
