const mongoose = require('mongoose');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
mongoose.connect(uri)
    .then(async () => {
        const User = mongoose.model('User', new mongoose.Schema({ name: String, driverType: String }));
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({ driver: mongoose.Schema.Types.ObjectId, vehicle: mongoose.Schema.Types.ObjectId, date: String }));
        
        const rams = await User.find({ name: /Ram/i });
        console.log(`Found ${rams.length} drivers matching Ram.`);
        
        for (const ram of rams) {
             const records = await Attendance.find({ driver: ram._id });
             console.log(`Ram (${ram._id}, type: ${ram.driverType}) has ${records.length} attendance records.`);
        }
        
        process.exit(0);
    });
