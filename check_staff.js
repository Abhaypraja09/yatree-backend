const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const User = require('./src/models/User');
        const users = await User.find({ role: 'Staff' }, 'name staffType baseSalary salary leaveDeductionRate createdAt joiningDate');
        console.log(JSON.stringify(users, null, 2));
        process.exit();
    });
