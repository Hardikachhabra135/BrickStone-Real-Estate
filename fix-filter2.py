with open('FRONTEND/allproperties.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = "const qCat = lowerCat.replace(/\s+/g, '');\n                    if (c === qCat || sc === qCat) return true;"
replacement = '''const qCat = lowerCat.replace(/\\s+/g, '');
                    if (c === qCat || sc === qCat) return true;
                    if (prop.category && prop.category.toLowerCase().replace(/\\s+/g, '') === qCat) return true;
                    if (prop.subcategory && prop.subcategory.toLowerCase().replace(/\\s+/g, '') === qCat) return true;'''

content = content.replace(target, replacement)

with open('FRONTEND/allproperties.html', 'w', encoding='utf-8') as f:
    f.write(content)
