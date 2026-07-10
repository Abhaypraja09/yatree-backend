const mongoose = require('mongoose');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
mongoose.connect(uri)
    .then(async () => {
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({ driver: mongoose.Schema.Types.ObjectId, vehicle: mongoose.Schema.Types.ObjectId }));
        const User = mongoose.model('User', new mongoose.Schema({ name: String }));
        
        const rams = await User.find({ name: /Ram/i });
        const ramIds = rams.map(r => r._id);
        
        // Find all attendance records for any Ram on RJ-27-TA-9836 (id 6982ef26508a22188c61886a)
        const result = await Attendance.deleteMany({ driver: { $in: ramIds }, vehicle: '6982ef26508a22188c61886a' });
        
        console.log(`Deleted ${result.deletedCount} attendance records for Ram on RJ-27-TA-9836.`);
        
        process.exit(0);
    });
