const express = require('express');
const router = express.Router();
const internAdminController = require('../controllers/internAdminController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes here should be protected by Admin Auth
router.use(authMiddleware.verifyToken);

// Intern Management
router.post('/interns', internAdminController.createIntern);
router.get('/interns', internAdminController.getInterns);
router.get('/interns/:id', internAdminController.getInternById);
router.put('/interns/:id', internAdminController.updateIntern);
router.patch('/interns/:id/status', internAdminController.updateInternStatus);
router.post('/interns/:id/reset-password', internAdminController.resetInternPassword);
router.get('/interns/:id/properties', internAdminController.getInternProperties);

// Intern Property Review
router.get('/intern-properties', internAdminController.getInternPropertiesToReview);
router.post('/intern-properties/:id/publish', internAdminController.publishProperty);
router.post('/intern-properties/:id/request-changes', internAdminController.requestChanges);
router.post('/intern-properties/:id/reject', internAdminController.rejectProperty);
router.patch('/intern-properties/:id/review', internAdminController.reviewProperty);

module.exports = router;
