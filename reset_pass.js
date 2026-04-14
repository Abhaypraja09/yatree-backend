const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const User = require('./src/models/User');
    const users = await User.find({ role: { $in: ['Executive', 'Admin', 'SuperAdmin', 'superadmin', 'admin'] } }).select('username name role');
    console.log('Admins/Executives:', users);
    
    const target = await User.findOne({ username: /Kavishuser1/i });
    if (target) {
        target.password = '@2526Bigday';
        await target.save();
        console.log('Password reset to @2526Bigday for', target.username);
    } else {
        console.log('User Kavishuser1 not found!');
    }
    
    process.exit(0);
});
