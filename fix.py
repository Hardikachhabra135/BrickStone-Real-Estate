import re

with open('ADMIN_PANEL/app.min.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix window.handleCreateIntern closing brace
code = code.replace(
    '''        document.getElementById('interns-table-body').innerHTML = '<tr><td colspan="5" style="color:red;">Exception: ' + err.message + '</td></tr>';\n    }\n}''',
    '''        document.getElementById('interns-table-body').innerHTML = '<tr><td colspan="5" style="color:red;">Exception: ' + err.message + '</td></tr>';\n    }\n});'''
)

code = code.replace(
    '''    }     catch(err) {\n        console.error(err);\n        document.getElementById('interns-table-body').innerHTML = '<tr><td colspan="5" style="color:red;">Exception: ' + err.message + '</td></tr>';\n    }\n});\n\nasync function loadInterns()''',
    '''    }     catch(err) {\n        console.error(err);\n        document.getElementById('interns-table-body').innerHTML = '<tr><td colspan="5" style="color:red;">Exception: ' + err.message + '</td></tr>';\n    }\n}\n\nasync function loadInterns()'''
)

with open('ADMIN_PANEL/app.min.js', 'w', encoding='utf-8') as f:
    f.write(code)
with open('ADMIN_PANEL/app.js', 'w', encoding='utf-8') as f:
    f.write(code)
