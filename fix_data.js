const mongoose = require('mongoose');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';

mongoose.connect(uri).then(async () => {
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({ driver: mongoose.Schema.Types.ObjectId }, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({ name: String, role: String, salary: Number }, { strict: false }));
    
    const ram1 = await User.findOne({ _id: '6a4e42375a8155ddaf3d8297' });
    const ram2 = await User.findOne({ _id: '6a4e45ae0546016c6a519765' });
    const shyam = await User.findOne({ _id: '6a4e5b106d57c52df2c611b4' });
    
    if (shyam) {
        shyam.role = 'Driver';
        shyam.salary = 15000;
        await shyam.save();
        console.log("Updated Shyam's role to Driver and salary to 15000");
    }
    
    if (ram1 && ram2) {
        const res = await Attendance.updateMany({ driver: ram1._id }, { $set: { driver: ram2._id } });
        console.log(`Moved ${res.modifiedCount} duties from Ram1 (deleted) to Ram2 (active)`);
    }
    
    process.exit(0);
});
