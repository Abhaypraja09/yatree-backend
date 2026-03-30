const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const vehicleSchema = new mongoose.Schema({ carNumber: String, isOutsideCar: Boolean });
    const attendanceSchema = new mongoose.Schema({ vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }, date: String });
    const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);
    const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

    const vehicles = await Vehicle.find({ carNumber: { $in: ['RJ-27-TA-9822', 'RJ-27-TA-8946'] } });
    console.log('VEHICLES:', JSON.stringify(vehicles, null, 2));

    const todayDate = new Date().toISOString().split('T')[0];
    const atts = await Attendance.find({ date: todayDate }).populate('vehicle').lean();
    const usedVehiclesCount = new Set(atts.filter(a => a.vehicle).map(a => a.vehicle.carNumber)).size;
    console.log('UNIQUE CARS USED TODAY IN ATTENDANCE:', usedVehiclesCount);
    
    process.exit();
}

check().catch(err => { console.error(err); process.exit(1); });
