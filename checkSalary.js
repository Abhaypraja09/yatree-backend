const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(async () => {
    const User = require('./src/models/User');
    const driver = await User.findOne({ mobile: '12345657885' });
    console.log('RAM salary:', driver.salary, 'dailyWage:', driver.dailyWage);
    process.exit(0);
});
