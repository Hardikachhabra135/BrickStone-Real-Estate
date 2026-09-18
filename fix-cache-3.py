with open('ADMIN_PANEL/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('src="app.min.js?v=2"', 'src="app.min.js?v=3"')
content = content.replace('src="config.js?v=2"', 'src="config.js?v=3"')

with open('ADMIN_PANEL/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html cache busters to v=3!")
