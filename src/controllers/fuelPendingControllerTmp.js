
// @desc    Get all pending fuel expenses for a company
// @route   GET /api/admin/fuel/pending/:companyId
// @access  Private/Admin
const getPendingFuelExpenses = asyncHandler(async (req, res) => {
    // 1. Find all attendance documents that have at least one pending fuel expense
    const pendingDocs = await Attendance.find({
        company: req.params.companyId,
        'pendingExpenses.type': 'fuel',
        'pendingExpenses.status': 'pending'
    })
        .populate('driver', 'name')
        .populate('vehicle', 'carNumber')
        .sort({ date: -1 });

    // 2. Extract and format the specific pending expenses
    let formattedExpenses = [];

    pendingDocs.forEach(doc => {
        if (!doc.pendingExpenses || doc.pendingExpenses.length === 0) return;

        doc.pendingExpenses.forEach(exp => {
            if (exp.type === 'fuel' && exp.status === 'pending') {
                formattedExpenses.push({
                    _id: exp._id, // Expense ID
                    attendanceId: doc._id,
                    driver: doc.driver?.name || 'Unknown',
                    carNumber: doc.vehicle?.carNumber || 'Unknown',
                    amount: exp.amount,
                    km: exp.km,
                    fuelType: exp.fuelType || 'Diesel',
                    date: exp.createdAt || new Date(), // Fallback to now if missing
                    slipPhoto: exp.slipPhoto,
                    status: 'pending'
                });
            }
        });
    });

    res.json(formattedExpenses);
});
