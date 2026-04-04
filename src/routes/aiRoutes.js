const express = require('express');
const router = express.Router();
const { processAIQuery } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { checkCompany } = require('../middleware/authMiddleware');

router.post('/query', protect, checkCompany, processAIQuery);

module.exports = router;
