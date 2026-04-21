const express = require('express');
const router = express.Router();
const { processAIQuery, getAIBriefing, analyzeFleetPerformance, checkAlerts } = require('../controllers/aiController');
const { protect, checkCompany } = require('../middleware/authMiddleware');

router.post('/query', protect, checkCompany, processAIQuery);
router.post('/analyze', protect, checkCompany, analyzeFleetPerformance);
router.get('/briefing', protect, checkCompany, getAIBriefing);
router.get('/alerts-check', protect, checkCompany, checkAlerts);

module.exports = router;
