const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const cId = '69caf340162fc71dc07307d1'; // Abhay
        const drivers = await User.find({ company: cId, role: 'Driver' });
        const freelancers = drivers.filter(d => d.isFreelancer === true);
        const nonFreelancers = drivers.filter(d => d.isFreelancer !== true);
        
        console.log(`Abhay Company Driver Summary:`);
        console.log(`- Total Drivers: ${drivers.length}`);
        console.log(`- Freelancers (isFreelancer: true): ${freelancers.length}`);
        console.log(`- Regular Drivers: ${nonFreelancers.length}`);
        
        if (freelancers.length > 0) {
            console.log(`Example Freelancer: ${freelancers[0].name} (isFreelancer: ${freelancers[0].isFreelancer})`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
