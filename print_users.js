const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const User = require('./src/models/User');
    const all = await User.find({});
    
    let out = '';
    all.forEach(u => out += `UN: ${u.username} | N: ${u.name} | R: ${u.role}\n`);
    
    fs.writeFileSync('users_list_debug.txt', out);
    console.log('Done writing users_list_debug.txt');
    process.exit(0);
});
