const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const restoreFullYatree = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        const yatree = await db.collection('companies').findOne({ name: 'YatreeDestination' });
        const abhay = await db.collection('companies').findOne({ name: 'Abhay SuperX Fleet' });

        console.log('Target Yatree ID:', yatree?._id);
        console.log('Source Abhay ID:', abhay?._id);

        if (!yatree || !abhay) {
            console.error('One or both companies not found!');
            process.exit(1);
        }

        // 🚛 ACTION 1: Move Users to Yatree (EXCEPT for the new Abhay Admin)
        // I'll move everyone who is NOT abhay.superx@texi.com
        const updateUsers = await db.collection('users').updateMany(
            { company: abhay._id, username: { $ne: 'abhay.superx@texi.com' } },
            { $set: { company: yatree._id } }
        );
        console.log(`Moved ${updateUsers.modifiedCount} users back to Yatree (Isolated Abhay Admin).`);

        // 🚛 ACTION 2: Double check Vehicles are with Yatree
        const vCount = await db.collection('vehicles').countDocuments({ company: yatree._id });
        console.log(`Yatree now has ${vCount} vehicles.`);

        // 🚛 ACTION 3: Ensure Abhay Admin is pointing to Abhay Co
        await db.collection('users').updateOne(
            { username: 'abhay.superx@texi.com' },
            { $set: { company: abhay._id } }
        );
        console.log('Abhay Admin verified with Abhay Co.');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

restoreFullYatree();
