const User = require('../src/models/User');
const Company = require('../src/models/Company');

const seed = async () => {
    try {
        // Create Companies
        const companies = ['YatreeDestination'];
        for (let name of companies) {
            await Company.findOneAndUpdate(
                { name },
                { name },
                { upsert: true, new: true }
            );
            console.log(`Company ${name} ensured`);
        }

        // Create Admin
        const adminMobile = '9999888877';
        const adminData = {
            name: 'System Admin',
            mobile: adminMobile,
            password: 'adminpassword123',
            role: 'Admin'
        };

        const adminUser = await User.findOne({ mobile: adminMobile });
        if (!adminUser) {
            await User.create(adminData);
            console.log('Admin user created');
        } else {
            console.log('Admin user already exists');
        }

        console.log('Seed check completed');
    } catch (error) {
        console.error(`Seed Error: ${error.message}`);
    }
};

module.exports = { seed };
