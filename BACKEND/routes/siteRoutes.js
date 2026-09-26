const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/about', siteController.getAboutContent);
router.patch('/about', authMiddleware.verifyToken, siteController.updateAboutContent);

module.exports = router;
