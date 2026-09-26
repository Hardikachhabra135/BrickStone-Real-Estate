const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/authMiddleware');

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

router.post('/', auth.verifyToken, upload.array('files', 5), (req, res) => {
    try {
        const urls = req.files.map(f => 'https://brickstone-real-estate-m8w1.onrender.com/uploads/' + f.filename);
        res.json({ success: true, urls });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});

module.exports = router;
