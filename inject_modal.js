const fs = require('fs');

const indexHtml = fs.readFileSync('FRONTEND/index.html', 'utf-8');
const propertiesHtml = fs.readFileSync('FRONTEND/properties.html', 'utf-8');

const startStr = '<div class="modal-overlay" id="property-modal">';
const endStr = '</div>\n\n    <script src="script.js"></script>';

const startIndex = indexHtml.indexOf(startStr);
const endIndex = indexHtml.indexOf(endStr, startIndex) + endStr.length - '    <script src="script.js"></script>'.length;

const modalHtml = indexHtml.substring(startIndex, endIndex);

if (!propertiesHtml.includes('id="property-modal"')) {
    const newPropertiesHtml = propertiesHtml.replace('    <script src="script.js"></script>', modalHtml + '    <script src="script.js"></script>');
    fs.writeFileSync('FRONTEND/properties.html', newPropertiesHtml);
    console.log('Modal injected!');
} else {
    console.log('Modal already exists.');
}
