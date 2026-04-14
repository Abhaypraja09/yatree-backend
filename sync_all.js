const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const syncAll = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const search = 'abhay.superx@texi.com'.trim();
        const newPass = 'abhay123';
        
        // 1. Update User (Hashed)
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPass, salt);
        await mongoose.connection.db.collection('users').updateOne(
            { username: search },
            { $set: { password: hashed, status: 'active' } }
        );
        console.log('User password updated (Hashed).');

        // 2. Update Tenant (Plain)
        await mongoose.connection.db.collection('tenants').updateOne(
            { adminEmail: search },
            { $set: { adminPassword: newPass } }
        );
        console.log('Tenant password updated (Plain).');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

syncAll();
