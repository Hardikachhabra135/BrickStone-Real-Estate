const fs = require('fs');

// 1. Fix the Testimonials table class in index.html
let html = fs.readFileSync('ADMIN_PANEL/index.html', 'utf8');
html = html.replace('<table class="data-table">', '<table class="premium-table full-width">');
fs.writeFileSync('ADMIN_PANEL/index.html', html, 'utf8');

// 2. Fix the about preview image in app.min.js and app.js
function fixSrc(path) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Fix updateAboutPreview src logic
    const oldSrcLogic = \    if (src.startsWith('images/')) {
        src = \\\/\\\\\\;
    }\;
    const newSrcLogic = \    if (src.startsWith('images/')) {
        src = 'https://brick-stone-frontend.vercel.app/' + src;
    }\;
    content = content.replace(oldSrcLogic, newSrcLogic);

    // Fix loadAllData to include interns
    const oldLoadAll = \unction loadAllData() {
    loadDashboardStats();
    loadCharts();
    loadProperties();
    loadEnquiries();
    loadContacts();
    loadAboutSection();
    loadAdminTestimonials();
}\;
    const newLoadAll = \unction loadAllData() {
    loadDashboardStats();
    loadCharts();
    loadProperties();
    loadEnquiries();
    loadContacts();
    loadAboutSection();
    loadAdminTestimonials();
    loadInterns();
    loadInternListings();
}\;
    content = content.replace(oldLoadAll, newLoadAll);
    
    // Fix empty testimonials
    const emptyTestimonials = \  tbody.innerHTML = '';
  tests.forEach(t => {\;
    const newEmptyTestimonials = \  tbody.innerHTML = '';
  if (tests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No testimonials found. Click \\"Add Testimonial\\" to create one.</td></tr>';
      return;
  }
  tests.forEach(t => {\;
    content = content.replace(emptyTestimonials, newEmptyTestimonials);
    
    fs.writeFileSync(path, content, 'utf8');
}

fixSrc('ADMIN_PANEL/app.js');
fixSrc('ADMIN_PANEL/app.min.js');

console.log('Fixed CSS and Image Preview');
