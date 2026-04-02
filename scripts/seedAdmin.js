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
        const adminMobile = 'kavishuser1';
        const targetCompany = await Company.findOne({ name: 'YatreeDestination' });
        
        const adminData = {
            name: 'System Admin',
            mobile: adminMobile,
            password: '@2526Bigday',
            role: 'Admin',
            company: targetCompany ? targetCompany._id : null
        };

        const adminUser = await User.findOne({ mobile: adminMobile });
        if (!adminUser) {
            await User.create(adminData);
            console.log('Admin user created and assigned to YatreeDestination');
        } else {
            // Update existing user to ensure company is set
            if (targetCompany && (!adminUser.company || adminUser.company.toString() !== targetCompany._id.toString())) {
                adminUser.company = targetCompany._id;
                await adminUser.save();
                console.log('Admin user company assignment updated to YatreeDestination');
            } else {
                console.log('Admin user already exists with correct company assignment');
            }
        }

        console.log('Seed check completed');
    } catch (error) {
        console.error(`Seed Error: ${error.message}`);
    }
};

module.exports = { seed };
