const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    driver: mongoose.Schema.Types.ObjectId,
    status: String,
    date: String,
    punchIn: { time: Date },
    punchOut: { time: Date }
});

const userSchema = new mongoose.Schema({
    tripStatus: String
});

const Attendance = mongoose.model('AttendanceCheck', attendanceSchema, 'attendances');
const User = mongoose.model('UserCheck', userSchema, 'users');

const checkDriverState = async () => {
    try {
        await mongoose.connect('mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true');

        const driverId = '698b03eb6bd90f103e7c9abc'; // Abhay
        const driver = await User.findById(driverId);
        console.log('Driver TripStatus:', driver.tripStatus);

        const attendance = await Attendance.findOne({ driver: driverId }).sort({ _id: -1 });
        if (attendance) {
            console.log('Latest Attendance:');
            console.log('  ID:', attendance._id);
            console.log('  Date:', attendance.date);
            console.log('  Status:', attendance.status);
            console.log('  PunchIn Time:', attendance.punchIn?.time);
            console.log('  PunchOut Time:', attendance.punchOut?.time);
        } else {
            console.log('No attendance found');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkDriverState();
