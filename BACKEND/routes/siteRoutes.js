const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/about', siteController.getAboutContent);
router.patch('/about', authMiddleware.verifyToken, siteController.updateAboutContent);

// Testimonials Endpoints
router.get('/testimonials', siteController.getTestimonials);
router.patch('/testimonials', siteController.updateTestimonials);
router.put('/testimonials/:id', siteController.updateSingleTestimonial);

module.exports = router;
