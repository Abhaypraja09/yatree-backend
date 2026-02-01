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
    deleteBorderTax,
    rechargeFastag,
    freelancerPunchIn,
    freelancerPunchOut
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');
const { storage } = require('../config/cloudinary');
const multer = require('multer');
const upload = multer({ storage });

router.use(protect);
router.use(admin);

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

router.post('/drivers', driverUpload, createDriver);
router.get('/drivers/:companyId', getAllDrivers);
router.put('/drivers/:id', updateDriver);
router.patch('/drivers/:id/status', toggleDriverStatus);
router.delete('/drivers/:id', deleteDriver);
router.post('/drivers/:id/documents', upload.single('document'), uploadDriverDocument);
router.patch('/drivers/:id/documents/:docId/verify', verifyDriverDocument);

router.post('/vehicles', vehicleUpload, createVehicle);
router.get('/vehicles/:companyId', getAllVehicles);
router.put('/vehicles/:id', updateVehicle);
router.delete('/vehicles/:id', deleteVehicle);
router.post('/vehicles/:id/documents', upload.single('document'), uploadVehicleDocument);

router.post('/assign', assignVehicle);
router.get('/dashboard/:companyId', getDashboardStats);
router.get('/reports/:companyId', getDailyReports);
router.patch('/drivers/:driverId/approve-trip', approveNewTrip);

// Border Tax
router.post('/border-tax', upload.single('receiptPhoto'), addBorderTax);
router.get('/border-tax/:companyId', getBorderTaxEntries);
router.delete('/border-tax/:id', deleteBorderTax);

// Fastag
router.post('/vehicles/:id/fastag-recharge', rechargeFastag);

// Freelancer
router.post('/freelancers/punch-in', freelancerPunchIn);
router.post('/freelancers/punch-out', freelancerPunchOut);

module.exports = router;
