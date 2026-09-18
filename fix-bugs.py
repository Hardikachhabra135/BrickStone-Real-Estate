import os

html_path = 'ADMIN_PANEL/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()
html = html.replace('<table class="data-table">', '<table class="premium-table full-width">')
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)


def fix_js(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    old_src = '''    if (src.startsWith('images/')) {
        src = /;
    }'''
    new_src = '''    if (src.startsWith('images/')) {
        src = 'https://brick-stone-frontend.vercel.app/' + src;
    }'''
    content = content.replace(old_src, new_src)

    old_load = '''function loadAllData() {
    loadDashboardStats();
    loadCharts();
    loadProperties();
    loadEnquiries();
    loadContacts();
    loadAboutSection();
    loadAdminTestimonials();
}'''
    new_load = '''function loadAllData() {
    loadDashboardStats();
    loadCharts();
    loadProperties();
    loadEnquiries();
    loadContacts();
    loadAboutSection();
    loadAdminTestimonials();
    loadInterns();
    loadInternListings();
}'''
    content = content.replace(old_load, new_load)

    old_empty = '''  tbody.innerHTML = '';
  tests.forEach(t => {'''
    new_empty = '''  tbody.innerHTML = '';
  if (tests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No testimonials found. Click "Add Testimonial" to create one.</td></tr>';
      return;
  }
  tests.forEach(t => {'''
    content = content.replace(old_empty, new_empty)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_js('ADMIN_PANEL/app.js')
fix_js('ADMIN_PANEL/app.min.js')
print("Fixed!")
