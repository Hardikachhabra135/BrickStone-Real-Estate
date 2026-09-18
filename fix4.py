with open('ADMIN_PANEL/app.min.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

lines[1262] = '}\n'

with open('ADMIN_PANEL/app.min.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)
