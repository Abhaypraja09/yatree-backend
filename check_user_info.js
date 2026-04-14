const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');
const Company = require('./src/models/Company');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ 
            $or: [{ username: 'kavishuser1' }, { mobile: 'kavishuser1' }] 
        }).populate('company');
        if (!user) {
            console.log('User not found');
            process.exit(0);
        }
        console.log('User found:');
        console.log(`- Username: ${user.username}`);
        console.log(`- Role: ${user.role}`);
        console.log(`- Company: ${user.company?.name} (${user.company?._id})`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
