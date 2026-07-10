const mongoose = require('mongoose');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';

mongoose.connect(uri).then(async () => {
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    const ram = await User.findOne({ name: /Ram/i, driverType: 'Bus' });
    console.log("Ram ID:", ram._id);
    
    const count = await Attendance.countDocuments({ driver: ram._id, status: 'completed' });
    console.log("Total duties:", count);
    
    const sample = await Attendance.findOne({ driver: ram._id });
    console.log("Sample duty:", sample);
    
    process.exit(0);
});
