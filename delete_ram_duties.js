const mongoose = require('mongoose');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
mongoose.connect(uri)
    .then(async () => {
        const User = mongoose.model('User', new mongoose.Schema({ name: String, driverType: String }));
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({ driver: mongoose.Schema.Types.ObjectId }));
        
        const ram = await User.findOne({ name: /Ram/i, driverType: 'Bus' });
        
        if (ram) {
            const result = await Attendance.deleteMany({ driver: ram._id });
            console.log(`Deleted ${result.deletedCount} records for Ram.`);
        }
        process.exit(0);
    });
