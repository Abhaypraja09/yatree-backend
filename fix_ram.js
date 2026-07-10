const mongoose = require('mongoose');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';
mongoose.connect(uri)
    .then(async () => {
        const User = mongoose.model('User', new mongoose.Schema({ name: String, driverType: String }));
        const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ carNumber: String }));
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({ driver: mongoose.Schema.Types.ObjectId, vehicle: mongoose.Schema.Types.ObjectId, date: String }));
        
        const ram = await User.findOne({ name: /Ram/i, driverType: 'Bus' });
        const bus = await Vehicle.findOne({ carNumber: /RJ27TA0001/i });
        
        console.log('Ram ID:', ram ? ram._id : 'Not found');
        console.log('Bus ID:', bus ? bus._id : 'Not found');
        
        if (ram && bus) {
            // Find records for Ram
            const records = await Attendance.find({ driver: ram._id });
            console.log(`Found ${records.length} total attendance records for Ram.`);
            
            // Collect all unique vehicle IDs
            const uniqueVehicles = [...new Set(records.map(r => r.vehicle.toString()))];
            console.log('Unique vehicle IDs in Ram\'s records:', uniqueVehicles);
            
            // Get car numbers for these vehicles
            for (const vId of uniqueVehicles) {
                const v = await Vehicle.findById(vId);
                console.log(`Vehicle ${vId}: ${v ? v.carNumber : 'Unknown'}`);
            }
            
            const result = await Attendance.updateMany(
                { driver: ram._id }, 
                { $set: { vehicle: bus._id } }
            );
            console.log('Updated all Ram records to use bus vehicle. Count:', result.modifiedCount);
        }
        process.exit(0);
    });
