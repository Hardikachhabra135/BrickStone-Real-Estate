const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');

const authMiddleware = require('../middleware/authMiddleware');

// POST /api/enquiries (Public, from website)
router.post('/', enquiryController.createEnquiry);

// GET /api/enquiries (Protected)
router.get('/', authMiddleware.verifyToken, enquiryController.getAllEnquiries);

// PUT /api/enquiries/:id (Protected)
router.put('/:id', authMiddleware.verifyToken, enquiryController.updateEnquiryStatus);

module.exports = router;
