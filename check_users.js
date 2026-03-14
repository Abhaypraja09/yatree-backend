require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const users = await User.find({}, 'name mobile username role isFreelancer');
    console.log(users);
    
    process.exit();
}
run();
