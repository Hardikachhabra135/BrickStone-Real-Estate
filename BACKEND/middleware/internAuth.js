const jwt = require('jsonwebtoken');

exports.verifyInternToken = (req, res, next) => {
    const token = req.header('Authorization');
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'brickstone_secret_key');
        
        if (decoded.role !== 'intern') {
            return res.status(403).json({ success: false, message: 'Access Denied. Only interns can access this.' });
        }
        
        req.intern = decoded; // Contains id, intern_id, email, etc.
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};
