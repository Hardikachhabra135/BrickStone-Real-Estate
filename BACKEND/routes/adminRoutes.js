const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

const authMiddleware = require('../middleware/authMiddleware');

// GET /api/admin/dashboard-stats (Protected)
router.get('/dashboard-stats', authMiddleware.verifyToken, adminController.getDashboardStats);

module.exports = router;
