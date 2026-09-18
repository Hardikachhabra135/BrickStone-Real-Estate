import os

with open('ADMIN_PANEL/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('src="app.min.js"', 'src="app.min.js?v=2"')
content = content.replace('src="config.js"', 'src="config.js?v=2"')

with open('ADMIN_PANEL/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html cache busters!")
