with open('ADMIN_PANEL/app.min.js', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    "document.getElementById('intern-modal')",
    "(document.getElementById('create-intern-form') ? document.getElementById('create-intern-modal') : document.getElementById('intern-modal'))"
)

with open('ADMIN_PANEL/app.min.js', 'w', encoding='utf-8') as f:
    f.write(code)
with open('ADMIN_PANEL/app.js', 'w', encoding='utf-8') as f:
    f.write(code)
