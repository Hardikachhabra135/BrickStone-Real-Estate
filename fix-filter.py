import re

with open('FRONTEND/allproperties.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"const qCat = lowerCat\.replace\(/\\s\+/g, ''\);\s*if \(c === qCat \|\| sc === qCat\) return true;"

replacement = '''const qCat = lowerCat.replace(/\\s+/g, '');
                    if (c === qCat || sc === qCat) return true;
                    if (prop.category && prop.category.toLowerCase().replace(/\\s+/g, '') === qCat) return true;
                    if (prop.subcategory && prop.subcategory.toLowerCase().replace(/\\s+/g, '') === qCat) return true;'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('FRONTEND/allproperties.html', 'w', encoding='utf-8') as f:
    f.write(content)
