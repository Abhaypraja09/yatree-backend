const mongoose = require('mongoose');
const User = require('./src/models/User');
const Company = require('./src/models/Company');
const dotenv = require('dotenv');

dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const search = 'abhay.superx@texi.com'.trim();
        console.log('Searching for:', search);

        const user = await User.findOne({
            $or: [
                { mobile: search },
                { username: { $regex: new RegExp(`^${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } },
                { username: search }
            ]
        }).populate('company');

        if (user) {
            console.log('USER OBJECT FOUND:');
            console.log('ID:', user._id);
            console.log('Name:', user.name);
            console.log('Username:', user.username);
            console.log('Mobile:', user.mobile);
            console.log('Role:', user.role);
            console.log('Company:', user.company?.name);
            console.log('Is Freelancer:', user.isFreelancer);
            console.log('Status:', user.status);
            console.log('Has Password:', !!user.password);
            console.log('Password (Partial):', user.password ? user.password.substring(0, 10) + '...' : 'NONE');
        } else {
            console.log('User NOT found.');
            
            // Search by Name
            const byName = await User.find({ name: /Abhay/i }).limit(5);
            console.log('Found by name "Abhay":', byName.map(u => ({name: u.name, username: u.username, mobile: u.mobile})));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
