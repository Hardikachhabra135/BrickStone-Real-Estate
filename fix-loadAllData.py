import os
import re

def fix_loadAllData(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    
    match = re.search(r'function loadAllData\(\) \{.*?\n\}', c, re.DOTALL)
    if not match:
        print('Not found in', path)
        return
        
    new_func = """function loadAllData() {
    try { loadDashboardStats(); } catch(e) { console.error('Error loading dashboard stats:', e); }
    try { loadCharts(); } catch(e) { console.error('Error loading charts:', e); }
    try { loadProperties(); } catch(e) { console.error('Error loading properties:', e); }
    try { loadEnquiries(); } catch(e) { console.error('Error loading enquiries:', e); }
    try { loadContacts(); } catch(e) { console.error('Error loading contacts:', e); }
    try { loadAboutSection(); } catch(e) { console.error('Error loading about section:', e); }
    try { loadAdminTestimonials(); } catch(e) { console.error('Error loading testimonials:', e); }
    try { loadInterns(); } catch(e) { console.error('Error loading interns:', e); }
    try { loadInternListings(); } catch(e) { console.error('Error loading intern listings:', e); }
}"""
    
    c = c[:match.start()] + new_func + c[match.end():]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

fix_loadAllData('ADMIN_PANEL/app.js')
fix_loadAllData('ADMIN_PANEL/app.min.js')
print("Fixed loadAllData safely!")
