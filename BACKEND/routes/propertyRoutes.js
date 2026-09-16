const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');

const authMiddleware = require('../middleware/authMiddleware');

// POST /api/properties (Admin/Staff only)
router.post('/', authMiddleware.verifyToken, propertyController.createProperty);

// GET /api/properties (Public)
router.get('/', propertyController.getAllProperties);

// GET /api/properties/:id (Public)
router.get('/:id', propertyController.getPropertyById);

// PUT /api/properties/:id (Admin/Staff only)
router.put('/:id', authMiddleware.verifyToken, propertyController.updateProperty);

// DELETE /api/properties/:id (Admin only)
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, propertyController.deleteProperty);

module.exports = router;
