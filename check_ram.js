const mongoose = require('mongoose');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
mongoose.connect(uri)
    .then(async () => {
        const User = mongoose.model('User', new mongoose.Schema({ name: String, driverType: String }));
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({ driver: mongoose.Schema.Types.ObjectId, vehicle: mongoose.Schema.Types.ObjectId, date: String, createdAt: Date }));
        
        const ram = await User.findOne({ name: /Ram/i, driverType: 'Bus' });
        
        if (ram) {
            const records = await Attendance.find({ driver: ram._id });
            console.log(`Found ${records.length} records for Ram.`);
            if (records.length > 0) {
                console.log('Sample dates:', records.map(r => r.date).slice(0, 5));
            }
        }
        process.exit(0);
    });
