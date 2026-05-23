const express = require('express');
const router = express.Router();
const {
    getWarranties,
    addWarranty,
    updateWarranty,
    deleteWarranty,
    getWarrantyStats
} = require('../controllers/warrantyController');
const { protect, adminOrExecutive } = require('../middleware/authMiddleware');
const { storage } = require('../config/cloudinary');
const multer = require('multer');
const upload = multer({ storage });

router.use(protect);

router.get('/:companyId', adminOrExecutive, getWarranties);
router.post('/', adminOrExecutive, upload.single('warrantyCardImage'), addWarranty);
router.put('/:id', adminOrExecutive, updateWarranty);
router.delete('/:id', adminOrExecutive, deleteWarranty);
router.get('/stats/:companyId', adminOrExecutive, getWarrantyStats);

module.exports = router;
