const express = require('express');
const router = express.Router();
const internPortalController = require('../controllers/internPortalController');
const internAuth = require('../middleware/internAuth');

// Public
router.post('/login', internPortalController.login);

// Protected
router.use(internAuth.verifyInternToken);

router.get('/me', internPortalController.getMe);
router.get('/properties', internPortalController.getProperties);
router.post('/properties', internPortalController.createProperty);
router.get('/properties/:id', internPortalController.getPropertyById);
router.put('/properties/:id', internPortalController.updateProperty);
router.post('/properties/:id/submit', internPortalController.submitProperty);
router.post('/properties/:id/resubmit', internPortalController.resubmitProperty);

module.exports = router;
