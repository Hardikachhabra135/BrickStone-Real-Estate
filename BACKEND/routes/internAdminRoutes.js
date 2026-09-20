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
router.delete('/interns/:id', internAdminController.deleteIntern);
router.post('/interns/:id/reset-password', internAdminController.resetInternPassword);
router.get('/interns/:id/properties', internAdminController.getInternProperties);

// Intern Property Review
router.get('/intern-properties', internAdminController.getInternPropertiesToReview);
router.put('/intern-properties/:id', internAdminController.updateInternListing);
router.post('/intern-properties/:id/publish', internAdminController.publishProperty);
router.post('/intern-properties/:id/request-changes', internAdminController.requestChanges);
router.post('/intern-properties/:id/reject', internAdminController.rejectProperty);
router.patch('/intern-properties/:id/review', internAdminController.reviewProperty);

// Chat
router.get('/interns/:id/chat', internAdminController.getChat);
router.post('/interns/:id/chat', internAdminController.sendMessage);
router.post('/chat/broadcast', internAdminController.broadcastMessage);

module.exports = router;
