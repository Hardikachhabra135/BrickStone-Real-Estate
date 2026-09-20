const express = require('express');
const router = express.Router();
const internPortalController = require('../controllers/internPortalController');
const internAuth = require('../middleware/internAuth');

// Public
router.post('/login', internPortalController.login);

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// Protected
router.use(internAuth.verifyInternToken);

router.post('/upload', upload.array('files', 5), (req, res) => {
    try {
        const urls = req.files.map(f => 'http://localhost:5000/uploads/' + f.filename);
        res.json({ success: true, urls });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});

router.get('/me', internPortalController.getMe);
router.get('/notifications', internPortalController.getNotifications);
router.get('/properties', internPortalController.getProperties);
router.post('/properties', internPortalController.createProperty);
router.get('/properties/:id', internPortalController.getPropertyById);
router.put('/properties/:id', internPortalController.updateProperty);
router.delete('/properties/:id', internPortalController.deleteListing);
router.post('/properties/:id/submit', internPortalController.submitProperty);
router.post('/properties/:id/resubmit', internPortalController.resubmitProperty);

router.get('/chat', internPortalController.getChat);
router.post('/chat', internPortalController.sendMessage);

module.exports = router;
