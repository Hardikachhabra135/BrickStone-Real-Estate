with open('ADMIN_PANEL/app.min.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r'src = http://localhost:8000/\$\{src\};', r'src = /;', content)

with open('ADMIN_PANEL/app.min.js', 'w', encoding='utf-8') as f:
    f.write(content)

with open('ADMIN_PANEL/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'src = http://localhost:8000/\$\{src\};', r'src = /;', content)

with open('ADMIN_PANEL/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
