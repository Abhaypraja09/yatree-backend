const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/yatree_fleet').then(async () => {
    const User = mongoose.model('User', new mongoose.Schema({ name: String, mobile: String, driverType: String }));
    const drivers = await User.find({ driverType: 'Bus' });
    console.log('Bus Drivers:', drivers);
    process.exit(0);
});
