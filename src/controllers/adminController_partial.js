// @desc    Get Detailed Salary Breakdown for a specific driver
// @route   GET /api/admin/salary-details/:driverId
// @access  Private/Admin
const getDriverSalaryDetails = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
        res.status(400);
        throw new Error('Please provide month and year');
    }

    const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const startStr = DateTime.fromJSDate(startOfMonth).toFormat('yyyy-MM-dd');
    const endStr = DateTime.fromJSDate(endOfMonth).toFormat('yyyy-MM-dd');

    // 1. Fetch Attendance
    const attendance = await Attendance.find({
        driver: driverId,
        status: 'completed',
        date: { $gte: startStr, $lte: endStr }
    }).sort({ date: 1 });

    // 2. Fetch Parking Entries (Independent)
    const parking = await Parking.find({
        $or: [
            { driverId: driverId }
            // We can add name check if we want, but ID is safer
        ],
        date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // 3. Fetch Advances
    const advances = await Advance.find({
        driver: driverId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
        remark: { $not: /Auto Generated|Daily Salary|Manual Duty Salary|Freelancer Daily Salary/ }
    });

    const driver = await User.findById(driverId).select('name mobile dailyWage');

    // Combine Data
    const dailyBreakdown = attendance.map(att => {
        const wage = Number(att.dailyWage) || Number(driver.dailyWage) || 500;
        const bonuses = (Number(att.punchOut?.allowanceTA) || 0) + (Number(att.punchOut?.nightStayAmount) || 0);

        // Only count actual embedded parking array, NOT tollParkingAmount (which is a misc trip charge)
        const embeddedParking = (att.parking && att.parking.length > 0)
            ? att.parking.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
            : 0; // DO NOT use tollParkingAmount - real parking is in parkingEntries below

        return {
            date: att.date,
            type: att.source === 'Manual' ? 'Manual Entry' : 'Duty',
            wage,
            bonuses,
            parking: embeddedParking,
            total: wage + bonuses + embeddedParking,
            vehicleId: att.vehicle,
            remarks: att.punchOut?.remarks
        };
    });

    res.json({
        driver,
        breakdown: dailyBreakdown,
        advances,
        parkingEntries: parking
    });
});
