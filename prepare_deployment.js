const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, 'FRONTEND');
const adminDir = path.join(__dirname, 'ADMIN_PANEL');

function injectConfig(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.endsWith('.html')) {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Check if config.js is already included
            if (!content.includes('<script src="config.js"></script>')) {
                // Insert before the last <script> tag or before </head>
                content = content.replace('</head>', '    <script src="config.js"></script>\n</head>');
                fs.writeFileSync(filePath, content);
                console.log(`Injected config.js into ${filePath}`);
            }
        }
    }
}

injectConfig(frontendDir);
injectConfig(adminDir);

// Now update FRONTEND/script.js to use window.ENV.API_URL
const frontendScriptPath = path.join(frontendDir, 'script.js');
let frontendScriptContent = fs.readFileSync(frontendScriptPath, 'utf8');
frontendScriptContent = frontendScriptContent.replace(/const API_BASE\s*=\s*['"]http:\/\/localhost:5000\/api['"];/g, 'const API_BASE = window.ENV.API_URL;');
fs.writeFileSync(frontendScriptPath, frontendScriptContent);
console.log('Updated FRONTEND/script.js');

// Now update FRONTEND/allproperties.html script block
const allPropsPath = path.join(frontendDir, 'allproperties.html');
let allPropsContent = fs.readFileSync(allPropsPath, 'utf8');
allPropsContent = allPropsContent.replace(/const API_URL\s*=\s*['"]http:\/\/localhost:5000\/api\/properties['"];/g, "const API_URL = window.ENV.API_URL + '/properties';");
allPropsContent = allPropsContent.replace(/const ENQUIRY_URL\s*=\s*['"]http:\/\/localhost:5000\/api\/enquiries['"];/g, "const ENQUIRY_URL = window.ENV.API_URL + '/enquiries';");
fs.writeFileSync(allPropsPath, allPropsContent);
console.log('Updated FRONTEND/allproperties.html API URLs');

// Now update ADMIN_PANEL/app.js
const adminAppPath = path.join(adminDir, 'app.js');
let adminAppContent = fs.readFileSync(adminAppPath, 'utf8');
adminAppContent = adminAppContent.replace(/const API_BASE\s*=\s*['"]http:\/\/localhost:5000\/api['"];/g, 'const API_BASE = window.ENV.API_URL;');
fs.writeFileSync(adminAppPath, adminAppContent);
console.log('Updated ADMIN_PANEL/app.js');
