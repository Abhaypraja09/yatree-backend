const mongoose = require('mongoose');
const Vehicle = require('./backend/src/models/Vehicle');
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true');
        const count = await Vehicle.countDocuments({ company: '6982e8b7d0b069a49db197b9', isOutsideCar: { $ne: true } });
        console.log('Vehicle Count for Comp 6982:', count);
        const allCompanys = await Vehicle.distinct('company');
        console.log('All Company IDs in Vehicles:', allCompanys);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
connectDB();
