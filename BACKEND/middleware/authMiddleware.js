const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ success: false, message: 'No token provided' });

    const tokenPart = token.split(' ')[1]; // Format: "Bearer <token>"
    
    jwt.verify(tokenPart || token, process.env.JWT_SECRET || 'supersecret123', (err, decoded) => {
        if (err) return res.status(401).json({ success: false, message: 'Unauthorized' });
        req.user = decoded;
        next();
    });
};

exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Requires admin role' });
    }
};
