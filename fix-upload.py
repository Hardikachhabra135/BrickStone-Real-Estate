with open('BACKEND/routes/uploadRoutes.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r'const urls = req\.files\.map\(f => .*?\);', "const urls = req.files.map(f => 'https://brickstone-real-estate.onrender.com/uploads/' + f.filename);", content)

with open('BACKEND/routes/uploadRoutes.js', 'w', encoding='utf-8') as f:
    f.write(content)
