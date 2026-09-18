const fs = require('fs');

let content = fs.readFileSync('BACKEND/middleware/authMiddleware.js', 'utf8');

const bypass = \        if (err) {
            // Localhost bypass: assume the token is a valid live token and try to extract the role
            console.log("Token verify failed but bypassing for localhost development.");
            const unverified = jwt.decode(tokenPart || token);
            req.user = unverified && unverified.user ? unverified.user : { role: 'admin', id: 1, username: 'admin' };
            return next();
        }\;

const strict = \        if (err) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }\;

content = content.replace(bypass, strict);
fs.writeFileSync('BACKEND/middleware/authMiddleware.js', content, 'utf8');
