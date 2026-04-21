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
    toggleVehicleStatus,
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
    updateFastagRecharge,
    deleteFastagRecharge,
    freelancerPunchIn,
    freelancerPunchOut,
    deleteBorderTax,
    updateBorderTax,
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
    updateAdvance,
    getDriverSalarySummary,
    getDriverSalaryDetails,
    addAllowance,
    getAllowances,
    updateAllowance,
    deleteAllowance,
    getAllExecutives,
    createExecutive,
    updateExecutive,
    deleteExecutive,
    addParkingEntry,
    getParkingEntries,
    getCarServiceEntries,
    deleteParkingEntry,
    updateParkingEntry,
    getPendingParkingExpenses,
    getAllStaff,
    createStaff,
    deleteStaff,
    getStaffAttendanceReports,
    addManualDuty,
    adminPunchIn,
    adminPunchOut,
    deleteAttendance,
    addAccidentLog,
    getAccidentLogs,
    deleteAccidentLog,
    updateAttendance,
    updateMaintenanceRecord,
    updateStaff,
    getPendingLeaveRequests,
    approveRejectLeave,
    getVehicleMonthlyDetails,
    addBackdatedAttendance,
    deleteStaffAttendance,
    addPendingExpenseFromAdmin,
    getPendingMaintenanceExpenses,
    getLiveFeed,
    getAllLoans,
    createLoan,
    updateLoan,
    deleteLoan,
    recordLoanRepayment
} = require('../controllers/adminController');
const {
    createEvent,
    getEvents,
    getEventDetails,
    updateEvent,
    deleteEvent
} = require('../controllers/eventController');
const { protect, admin, adminOrExecutive, checkCompany } = require('../middleware/authMiddleware');
const { storage } = require('../config/cloudinary');
const multer = require('multer');
const upload = multer({ storage });

router.use(protect);

const driverUpload = upload.fields([
    { name: 'aadharCard', maxCount: 1 },
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
router.get('/dashboard/:companyId', adminOrExecutive, checkCompany, getDashboardStats);
router.get('/live-feed/:companyId', adminOrExecutive, checkCompany, getLiveFeed);
router.get('/vehicle-monthly-details/:companyId', adminOrExecutive, checkCompany, getVehicleMonthlyDetails);
router.get('/reports/:companyId', adminOrExecutive, checkCompany, getDailyReports);
router.get('/vehicles/:companyId', adminOrExecutive, checkCompany, getAllVehicles);
router.get('/drivers/:companyId', adminOrExecutive, checkCompany, getAllDrivers);
router.post('/drivers', adminOrExecutive, checkCompany, driverUpload, createDriver);
router.put('/drivers/:id', adminOrExecutive, checkCompany, driverUpload, updateDriver);
router.post('/vehicles', adminOrExecutive, checkCompany, vehicleUpload, createVehicle);
router.put('/vehicles/:id', adminOrExecutive, checkCompany, vehicleUpload, updateVehicle);
const freelancerUpload = upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'kmPhoto', maxCount: 1 },
    { name: 'parkingPhoto', maxCount: 1 },
    { name: 'parkingPhotos', maxCount: 10 },
    { name: 'carSelfie', maxCount: 1 }
]);

router.post('/freelancers/punch-in', adminOrExecutive, checkCompany, freelancerUpload, freelancerPunchIn);
router.post('/freelancers/punch-out', adminOrExecutive, checkCompany, freelancerUpload, freelancerPunchOut);
router.get('/maintenance/:companyId', adminOrExecutive, checkCompany, getMaintenanceRecords);
router.get('/maintenance/pending/:companyId', adminOrExecutive, checkCompany, getPendingMaintenanceExpenses);
router.post('/maintenance', adminOrExecutive, checkCompany, upload.single('billPhoto'), addMaintenanceRecord);
router.put('/maintenance/:id', adminOrExecutive, upload.single('billPhoto'), updateMaintenanceRecord);
router.delete('/maintenance/:id', adminOrExecutive, deleteMaintenanceRecord);

// Admin Only Operations (Sensitive)
// Operational Routes (Shared Admin & Executive)
router.patch('/drivers/:id/status', adminOrExecutive, checkCompany, toggleDriverStatus);
router.patch('/vehicles/:id/status', adminOrExecutive, checkCompany, toggleVehicleStatus);
router.post('/drivers/:id/documents', adminOrExecutive, checkCompany, upload.single('document'), uploadDriverDocument);
router.patch('/drivers/:id/documents/:docId/verify', adminOrExecutive, checkCompany, verifyDriverDocument);
router.patch('/drivers/:driverId/approve-trip', adminOrExecutive, checkCompany, approveNewTrip);
router.post('/assign', adminOrExecutive, checkCompany, assignVehicle);
router.post('/vehicles/:id/documents', adminOrExecutive, checkCompany, upload.single('document'), uploadVehicleDocument);
router.post('/vehicles/:id/fastag-recharge', adminOrExecutive, checkCompany, upload.single('receiptPhoto'), rechargeFastag);
router.put('/vehicles/:id/fastag-recharge/:historyId', adminOrExecutive, checkCompany, upload.single('receiptPhoto'), updateFastagRecharge);
router.delete('/vehicles/:id/fastag-recharge/:historyId', adminOrExecutive, checkCompany, deleteFastagRecharge);

// Operational Routes (Shared Admin & Executive)
router.delete('/drivers/:id', adminOrExecutive, checkCompany, deleteDriver);
router.delete('/vehicles/:id', adminOrExecutive, checkCompany, deleteVehicle);
router.delete('/attendance/:id', adminOrExecutive, checkCompany, deleteAttendance);
router.put('/attendance/:id', adminOrExecutive, checkCompany, updateAttendance);
router.patch('/attendance/:attendanceId/expense/:expenseId', adminOrExecutive, checkCompany, approveRejectExpense);

router.post('/border-tax', adminOrExecutive, checkCompany, upload.single('receiptPhoto'), addBorderTax);
router.get('/border-tax/:companyId', adminOrExecutive, checkCompany, getBorderTaxEntries);
router.put('/border-tax/:id', adminOrExecutive, upload.single('receiptPhoto'), updateBorderTax);
router.delete('/border-tax/:id', adminOrExecutive, deleteBorderTax);

router.post('/fuel', adminOrExecutive, checkCompany, addFuelEntry);
router.get('/fuel/:companyId', adminOrExecutive, checkCompany, getFuelEntries);
router.put('/fuel/:id', adminOrExecutive, checkCompany, updateFuelEntry);
router.delete('/fuel/:id', adminOrExecutive, checkCompany, deleteFuelEntry);
router.get('/fuel/pending/:companyId', adminOrExecutive, checkCompany, getPendingFuelExpenses);

router.post('/parking', adminOrExecutive, checkCompany, addParkingEntry);
router.get('/parking/:companyId', adminOrExecutive, checkCompany, getParkingEntries);
router.put('/parking/:id', adminOrExecutive, checkCompany, updateParkingEntry);
router.delete('/parking/:id', adminOrExecutive, checkCompany, deleteParkingEntry);
router.get('/parking/pending/:companyId', adminOrExecutive, checkCompany, getPendingParkingExpenses);
router.get('/car-services/:companyId', adminOrExecutive, checkCompany, getCarServiceEntries);

// Financials (Shared Admin & Executive)
router.post('/expenses/pending', adminOrExecutive, checkCompany, addPendingExpenseFromAdmin);
router.post('/advances', adminOrExecutive, checkCompany, addAdvance);
router.get('/advances/:companyId', adminOrExecutive, checkCompany, getAdvances);
router.put('/advances/:id', adminOrExecutive, checkCompany, updateAdvance);
router.delete('/advances/:id', adminOrExecutive, checkCompany, deleteAdvance);

router.post('/allowances', adminOrExecutive, checkCompany, addAllowance);
router.get('/allowances/:companyId', adminOrExecutive, checkCompany, getAllowances);
router.put('/allowances/:id', adminOrExecutive, checkCompany, updateAllowance);
router.delete('/allowances/:id', adminOrExecutive, checkCompany, deleteAllowance);
router.get('/salary-summary/:companyId', adminOrExecutive, checkCompany, getDriverSalarySummary);
router.get('/salary-details/:driverId', adminOrExecutive, getDriverSalaryDetails);

// Loan Management
router.get('/loans/:companyId', adminOrExecutive, checkCompany, getAllLoans);
router.post('/loans', adminOrExecutive, checkCompany, createLoan);
router.put('/loans/:id', adminOrExecutive, checkCompany, updateLoan);
router.delete('/loans/:id', adminOrExecutive, checkCompany, deleteLoan);
router.post('/loans/repayment', adminOrExecutive, checkCompany, recordLoanRepayment);

// Executive Management (Super Admin only OR Manager with rights)
router.get('/executives', adminOrExecutive, checkCompany, getAllExecutives);
router.post('/executives', adminOrExecutive, checkCompany, createExecutive);
router.put('/executives/:id', adminOrExecutive, checkCompany, updateExecutive);
router.delete('/executives/:id', adminOrExecutive, checkCompany, deleteExecutive);

// Staff Management
router.get('/staff/:companyId', adminOrExecutive, checkCompany, getAllStaff);
router.post('/staff', adminOrExecutive, checkCompany, createStaff);
router.put('/staff/:id', adminOrExecutive, checkCompany, updateStaff);
router.delete('/staff/:id', adminOrExecutive, checkCompany, deleteStaff);
router.get('/staff-attendance/:companyId', adminOrExecutive, checkCompany, getStaffAttendanceReports);
router.delete('/staff-attendance/:id', adminOrExecutive, checkCompany, deleteStaffAttendance);
router.post('/staff-attendance/backdate', adminOrExecutive, checkCompany, addBackdatedAttendance);

// Leave Requests
router.get('/leaves/pending/:companyId', adminOrExecutive, checkCompany, getPendingLeaveRequests);
router.patch('/leaves/:id', adminOrExecutive, checkCompany, approveRejectLeave);

// Generic Upload Route
router.post('/upload', adminOrExecutive, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({ url: req.file.path });
});

router.post('/manual-duty', adminOrExecutive, checkCompany, addManualDuty);
router.post('/punch-in', adminOrExecutive, checkCompany, adminPunchIn);
router.post('/punch-out', adminOrExecutive, checkCompany, adminPunchOut);
router.get('/accident-logs/:companyId', adminOrExecutive, checkCompany, getAccidentLogs);
router.post('/accident-logs', adminOrExecutive, checkCompany, upload.array('photos', 5), addAccidentLog);
router.delete('/accident-logs/:id', adminOrExecutive, deleteAccidentLog);

// Event Management
router.post('/events', adminOrExecutive, checkCompany, createEvent);
router.get('/events/:companyId', adminOrExecutive, checkCompany, getEvents);
router.get('/events/details/:eventId', adminOrExecutive, checkCompany, getEventDetails);
router.put('/events/:id', adminOrExecutive, checkCompany, updateEvent);
router.delete('/events/:id', adminOrExecutive, checkCompany, deleteEvent);

module.exports = router;
