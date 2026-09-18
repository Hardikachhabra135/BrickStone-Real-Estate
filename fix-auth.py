import re

with open('BACKEND/middleware/authMiddleware.js', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"if \(err\) \{\s*// Localhost bypass.*?\s*return next\(\);\s*\}"

replacement = '''if (err) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('BACKEND/middleware/authMiddleware.js', 'w', encoding='utf-8') as f:
    f.write(content)
