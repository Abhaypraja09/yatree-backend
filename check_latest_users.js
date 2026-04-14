const fs = require('fs');
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // find all users
    const users = await User.find({}).sort({ role: 1 });
    let output = '';
    for (const u of users) {
        output += `${u.role} - ${u.name} - ${u.mobile} - ${u.isFreelancer ? 'Freelancer' : 'Company'}\n`;
    }
    fs.writeFileSync('users_output.txt', output, 'utf8');
    
    process.exit();
}
run();
