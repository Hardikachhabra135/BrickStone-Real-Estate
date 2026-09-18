with open('FRONTEND/allproperties.html', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('fetch(API_URL)', "fetch(API_URL + '?t=' + Date.now())")
with open('FRONTEND/allproperties.html', 'w', encoding='utf-8') as f:
    f.write(content)

with open('FRONTEND/script.js', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('fetch(${API_BASE}/properties)', "fetch(${API_BASE}/properties?t= + Date.now())")
with open('FRONTEND/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
