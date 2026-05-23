
const Attendance = require('../models/Attendance');
const Vehicle = require('../models/Vehicle');

const syncVehicleOdometer = async (vehicleId) => {
    if (!vehicleId) return;
    try {
        // Sort by date DESC first, then by punchOut time DESC
        const latestValidAttendance = await Attendance.findOne({
            vehicle: vehicleId,
            status: 'completed'
        }).sort({ date: -1, 'punchOut.time': -1 });

        let latestKm = 0;
        if (latestValidAttendance && latestValidAttendance.punchOut?.km) {
            latestKm = latestValidAttendance.punchOut.km;
        } else {
            // Find latest punchIn if no completed duties
            const latestPunchIn = await Attendance.findOne({
                vehicle: vehicleId
            }).sort({ date: -1, 'punchIn.time': -1 });

            if (latestPunchIn && latestPunchIn.punchIn?.km) {
                latestKm = latestPunchIn.punchIn.km;
            }
        }

        if (latestKm > 0) {
            await Vehicle.findByIdAndUpdate(vehicleId, { lastOdometer: latestKm });
            console.log(`[SYNC_KM] Vehicle ${vehicleId} updated to ${latestKm} KM`);
        }
    } catch (error) {
        console.error(`[SYNC_KM] Error for vehicle ${vehicleId}:`, error);
    }
};

module.exports = { syncVehicleOdometer };
