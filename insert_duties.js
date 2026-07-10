const mongoose = require('mongoose');
const uri = 'mongodb://yatree_admin:Mayank123@ac-n3u3fkt-shard-00-00.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-01.iuq9w0n.mongodb.net:27017,ac-n3u3fkt-shard-00-02.iuq9w0n.mongodb.net:27017/taxi-fleet?authSource=admin&tls=true';

mongoose.connect(uri).then(async () => {
    const User = mongoose.model('User', new mongoose.Schema({ name: String, mobile: String, driverType: String, role: String, company: mongoose.Schema.Types.ObjectId, password: String, status: String, dailyWage: Number }, { strict: false }));
    const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({ carNumber: String, company: mongoose.Schema.Types.ObjectId, type: String, currentDriver: mongoose.Schema.Types.ObjectId }, { strict: false }));
    const Company = mongoose.model('Company', new mongoose.Schema({ name: String }));
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({
        driver: mongoose.Schema.Types.ObjectId,
        company: mongoose.Schema.Types.ObjectId,
        vehicle: mongoose.Schema.Types.ObjectId,
        date: String,
        status: String,
        punchIn: Object,
        punchOut: Object,
        totalKM: Number,
        dailyWage: Number
    }, { strict: false }));

    const company = await Company.findOne();
    const ram = await User.findOne({ name: /Ram/i, driverType: 'Bus' });
    const shyam = await User.findOne({ name: /Shyam1/i, driverType: 'Bus' });
    const bus1 = await Vehicle.findOne({ carNumber: /RJ27TA0001/i });
    const bus2 = await Vehicle.findOne({ carNumber: /RJ27TA0002/i });

    const ramSkips = [10, 11, 12];
    const shyamSkips = [15, 16, 17, 18];

    const generateDuty = (driver, vehicle, day) => {
        const dateStr = `2026-06-${day.toString().padStart(2, '0')}`;
        const pInTime = new Date(`2026-06-${day.toString().padStart(2, '0')}T09:00:00Z`);
        const pOutTime = new Date(`2026-06-${day.toString().padStart(2, '0')}T18:00:00Z`);
        const openKm = day * 10;
        const closeKm = openKm + 10;
        
        return {
            driver: driver._id,
            company: company._id,
            vehicle: vehicle._id,
            date: dateStr,
            status: 'completed',
            dailyWage: driver.dailyWage || 500,
            totalKM: 10,
            punchIn: {
                km: openKm,
                time: pInTime,
                location: { address: 'Office' }
            },
            punchOut: {
                km: closeKm,
                time: pOutTime,
                remarks: 'Duty',
                tollParkingAmount: 0,
                allowanceTA: 0,
                nightStayAmount: 0,
                specialPay: 0,
                location: { address: 'Office' }
            }
        };
    };

    const duties = [];

    for (let day = 1; day <= 30; day++) {
        if (!ramSkips.includes(day)) {
            duties.push(generateDuty(ram, bus1, day));
        }
        if (!shyamSkips.includes(day)) {
            duties.push(generateDuty(shyam, bus2, day));
        }
    }

    await Attendance.insertMany(duties);
    console.log(`Inserted ${duties.length} duties!`);

    process.exit(0);
});
