const fs = require('fs');
let script = fs.readFileSync('FRONTEND/script.js', 'utf-8');

script = script.replace('modalCloseBtn.addEventListener(', 'if (modalCloseBtn) modalCloseBtn.addEventListener(');
script = script.replace('modalOverlay.addEventListener(', 'if (modalOverlay) modalOverlay.addEventListener(');
script = script.replace('enquireBtn.addEventListener(', 'if (enquireBtn) enquireBtn.addEventListener(');
script = script.replace('backToDetailsBtn.addEventListener(', 'if (backToDetailsBtn) backToDetailsBtn.addEventListener(');
script = script.replace('enquiryForm.addEventListener(', 'if (enquiryForm) enquiryForm.addEventListener(');

fs.writeFileSync('FRONTEND/script.js', script);
console.log('Script patched to prevent crashes!');
