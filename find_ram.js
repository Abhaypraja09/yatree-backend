const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/yatree_fleet')
    .then(async () => {
        const User = mongoose.model('User', new mongoose.Schema({ name: String, driverType: String }));
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ carNumber: String }));
        
        const drivers = await User.find({ name: /Ram/i });
        const vehicles = await Vehicle.find();
        
        console.log('Drivers matching Ram:', drivers.map(d => ({id: d._id, name: d.name, type: d.driverType})));
        console.log('Vehicles:', vehicles.map(v => ({id: v._id, num: v.carNumber})));
        
        process.exit(0);
    });
