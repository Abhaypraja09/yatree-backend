const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');
const Company = require('../src/models/Company');

dotenv.config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Create Companies
        const companies = ['YatreeDestination', 'GoGetGo'];
        const companyDocs = [];
        for (let name of companies) {
            const company = await Company.findOneAndUpdate(
                { name },
                { name },
                { upsert: true, new: true }
            );
            companyDocs.push(company);
            console.log(`Company ${name} ensured`);
        }

        // Create Admin
        const adminMobile = '9999888877';
        // Upsert admin to ensure password and role are correct
        const adminData = {
            name: 'System Admin',
            mobile: adminMobile,
            password: 'adminpassword123', // Will be hashed by pre-save hook? NO, update won't trigger pre-save!
            // Actually, for update, we need to handle hashing if we use findOneAndUpdate?
            // Better to delete and recreate if we want to rely on pre-save hook, 
            // OR manually hash here.
            role: 'Admin'
        };

        // Let's check if exists
        const adminUser = await User.findOne({ mobile: adminMobile });
        if (adminUser) {
            // If exists, we simply update properties, but for password reset we need to save()
            adminUser.name = 'System Admin';
            adminUser.password = 'adminpassword123'; // Logic to save will hash this? Yes if we usage save()
            adminUser.role = 'Admin';
            await adminUser.save();
            console.log('Admin user updated/reset');
        } else {
            await User.create(adminData);
            console.log('Admin user created');
        }

        console.log('Seed completed');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = {
    seed
}
