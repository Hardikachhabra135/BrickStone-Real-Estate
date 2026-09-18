with open('ADMIN_PANEL/app.min.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 1092 is }); instead of }
lines[1091] = '}\n'

with open('ADMIN_PANEL/app.min.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)
