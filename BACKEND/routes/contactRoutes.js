const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

const authMiddleware = require('../middleware/authMiddleware');

// POST /api/contact (Public)
router.post('/', contactController.createContact);

// GET /api/contact (Protected)
router.get('/', authMiddleware.verifyToken, contactController.getAllContacts);

// PUT /api/contact/:id (Protected)
router.put('/:id', authMiddleware.verifyToken, contactController.updateContactStatus);

module.exports = router;
