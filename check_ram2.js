const mongoose = require('mongoose');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
mongoose.connect(uri)
    .then(async () => {
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({ driver: mongoose.Schema.Types.ObjectId, vehicle: mongoose.Schema.Types.ObjectId }));
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ carNumber: String }));
        
        const ram2Id = '6a4e45ae0546016c6a519765';
        const records = await Attendance.find({ driver: ram2Id });
        
        const vIds = [...new Set(records.map(r => r.vehicle.toString()))];
        for (const vId of vIds) {
             const v = await Vehicle.findById(vId);
             console.log(`Vehicle ${vId}: ${v ? v.carNumber : 'Unknown'}`);
        }
        
        process.exit(0);
    });
