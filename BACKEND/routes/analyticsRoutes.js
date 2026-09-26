const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// POST /api/analytics/track
router.post('/track', analyticsController.trackEvent);

// Old endpoint compatibility just in case
router.post('/click', analyticsController.trackEvent);

// Dashboard data endpoints
router.get('/overview', analyticsController.getOverview);
router.get('/traffic', analyticsController.getDailyTraffic);
router.get('/sources', analyticsController.getSources);
router.get('/devices', analyticsController.getDevices);
router.get('/pages', analyticsController.getTopPages);

module.exports = router;
