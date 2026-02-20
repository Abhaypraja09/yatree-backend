const express = require('express');
const router = express.Router();
const {
    createDriver,
    createVehicle,
    assignVehicle,
    toggleDriverStatus,
    getDashboardStats,
    getAllDrivers,
    getAllVehicles,
    updateDriver,
    updateVehicle,
    deleteDriver,
    deleteVehicle,
    uploadVehicleDocument,
    uploadDriverDocument,
    verifyDriverDocument,
    getDailyReports,
    approveNewTrip,
    addBorderTax,
    getBorderTaxEntries,
    rechargeFastag,
    freelancerPunchIn,
    freelancerPunchOut,
    deleteBorderTax,
    addMaintenanceRecord,
    getMaintenanceRecords,
    deleteMaintenanceRecord,
    addFuelEntry,
    getFuelEntries,
    deleteFuelEntry,
    updateFuelEntry,
    approveRejectExpense,
    getPendingFuelExpenses,
    addAdvance,
    getAdvances,
    deleteAdvance,
    getDriverSalarySummary,
    getDriverSalaryDetails,
    getAllExecutives,
    createExecutive,
    deleteExecutive,
    addParkingEntry,
    getParkingEntries,
    deleteParkingEntry,
    getPendingParkingExpenses,
    getAllStaff,
    createStaff,
    deleteStaff,
    getStaffAttendanceReports,
    addManualDuty,
    deleteAttendance,
    addAccidentLog,
    getAccidentLogs,
    deleteAccidentLog,
    updateAttendance,
    updateMaintenanceRecord
} = require('../controllers/adminController');
const { protect, admin, adminOrExecutive } = require('../middleware/authMiddleware');
const { storage } = require('../config/cloudinary');
const multer = require('multer');
const upload = multer({ storage });

router.use(protect);

const driverUpload = upload.fields([
    { name: 'aadharFront', maxCount: 1 },
    { name: 'aadharBack', maxCount: 1 },
    { name: 'drivingLicense', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 },
    { name: 'offerLetter', maxCount: 1 }
]);

const vehicleUpload = upload.fields([
    { name: 'rc', maxCount: 1 },
    { name: 'insurance', maxCount: 1 },
    { name: 'puc', maxCount: 1 },
    { name: 'fitness', maxCount: 1 },
    { name: 'permit', maxCount: 1 }
]);

// Shared Routes (Admin & Executive)
router.get('/dashboard/:companyId', adminOrExecutive, getDashboardStats);
router.get('/reports/:companyId', adminOrExecutive, getDailyReports);
router.get('/vehicles/:companyId', adminOrExecutive, getAllVehicles);
router.get('/drivers/:companyId', adminOrExecutive, getAllDrivers);
router.post('/drivers', adminOrExecutive, driverUpload, createDriver);
router.put('/drivers/:id', adminOrExecutive, updateDriver);
router.post('/vehicles', adminOrExecutive, vehicleUpload, createVehicle);
router.put('/vehicles/:id', adminOrExecutive, vehicleUpload, updateVehicle);
router.post('/freelancers/punch-in', adminOrExecutive, freelancerPunchIn);
router.post('/freelancers/punch-out', adminOrExecutive, freelancerPunchOut);
router.get('/maintenance/:companyId', adminOrExecutive, getMaintenanceRecords);
router.post('/maintenance', adminOrExecutive, upload.single('billPhoto'), addMaintenanceRecord);
router.put('/maintenance/:id', adminOrExecutive, upload.single('billPhoto'), updateMaintenanceRecord);
router.delete('/maintenance/:id', adminOrExecutive, deleteMaintenanceRecord);

// Admin Only Operations (Sensitive)
// Operational Routes (Shared Admin & Executive)
router.patch('/drivers/:id/status', adminOrExecutive, toggleDriverStatus);
router.post('/drivers/:id/documents', adminOrExecutive, upload.single('document'), uploadDriverDocument);
router.patch('/drivers/:id/documents/:docId/verify', adminOrExecutive, verifyDriverDocument);
router.patch('/drivers/:driverId/approve-trip', adminOrExecutive, approveNewTrip);
router.post('/assign', adminOrExecutive, assignVehicle);
router.post('/vehicles/:id/documents', adminOrExecutive, upload.single('document'), uploadVehicleDocument);
router.post('/vehicles/:id/fastag-recharge', admin, rechargeFastag);

// Operational Routes (Shared Admin & Executive)
router.delete('/drivers/:id', adminOrExecutive, deleteDriver);
router.delete('/vehicles/:id', adminOrExecutive, deleteVehicle);
router.delete('/attendance/:id', adminOrExecutive, deleteAttendance);
router.put('/attendance/:id', adminOrExecutive, updateAttendance);
router.patch('/attendance/:attendanceId/expense/:expenseId', adminOrExecutive, approveRejectExpense);

router.post('/border-tax', adminOrExecutive, upload.single('receiptPhoto'), addBorderTax);
router.get('/border-tax/:companyId', adminOrExecutive, getBorderTaxEntries);
router.delete('/border-tax/:id', adminOrExecutive, deleteBorderTax);

router.post('/fuel', adminOrExecutive, addFuelEntry);
router.get('/fuel/:companyId', adminOrExecutive, getFuelEntries);
router.put('/fuel/:id', adminOrExecutive, updateFuelEntry);
router.delete('/fuel/:id', adminOrExecutive, deleteFuelEntry);
router.get('/fuel/pending/:companyId', adminOrExecutive, getPendingFuelExpenses);

router.post('/parking', adminOrExecutive, addParkingEntry);
router.get('/parking/:companyId', adminOrExecutive, getParkingEntries);
router.delete('/parking/:id', adminOrExecutive, deleteParkingEntry);
router.get('/parking/pending/:companyId', adminOrExecutive, getPendingParkingExpenses);

// Financials (Shared Admin & Executive)
router.post('/advances', adminOrExecutive, addAdvance);
router.get('/advances/:companyId', adminOrExecutive, getAdvances);
router.delete('/advances/:id', adminOrExecutive, deleteAdvance);
router.get('/salary-summary/:companyId', adminOrExecutive, getDriverSalarySummary);
router.get('/salary-details/:driverId', adminOrExecutive, getDriverSalaryDetails);

// Executive Management (Super Admin only)
router.get('/executives', admin, getAllExecutives);
router.post('/executives', admin, createExecutive);
router.delete('/executives/:id', admin, deleteExecutive);

// Staff Management
router.get('/staff/:companyId', adminOrExecutive, getAllStaff);
router.post('/staff', adminOrExecutive, createStaff);
router.delete('/staff/:id', adminOrExecutive, deleteStaff);
router.get('/staff-attendance/:companyId', adminOrExecutive, getStaffAttendanceReports);

// Generic Upload Route
router.post('/upload', adminOrExecutive, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({ url: req.file.path });
});

router.post('/manual-duty', adminOrExecutive, addManualDuty);
router.get('/accident-logs/:companyId', adminOrExecutive, getAccidentLogs);
router.post('/accident-logs', adminOrExecutive, upload.array('photos', 5), addAccidentLog);
router.delete('/accident-logs/:id', adminOrExecutive, deleteAccidentLog);

module.exports = router;
