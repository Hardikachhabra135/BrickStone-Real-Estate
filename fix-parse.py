import os

path1 = 'ADMIN_PANEL/app.min.js'
path2 = 'ADMIN_PANEL/app.js'

def fix_json_parse(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    
    old_code = "return JSON.parse(data);"
    new_code = """try {
    return JSON.parse(data);
  } catch(e) {
    console.error('Invalid testimonials JSON in localStorage, resetting...', e);
    localStorage.setItem('brickstone_testimonials', JSON.stringify(SEED_TESTIMONIALS));
    return SEED_TESTIMONIALS;
  }"""
    c = c.replace(old_code, new_code)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

fix_json_parse(path1)
fix_json_parse(path2)
print("Fixed JSON.parse in getTestimonials!")
