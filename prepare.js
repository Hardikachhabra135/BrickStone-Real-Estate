const fs = require('fs');

function replaceInFile(path, replacements) {
    if(!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    for (let r of replacements) {
        content = content.replace(r.regex, r.replace);
    }
    fs.writeFileSync(path, content, 'utf8');
}

const adminReplacements = [
    { 
        regex: /const base = isLocalEndpoint \? 'http:\/\/localhost:5000\/api' : API_BASE;/g, 
        replace: "const base = API_BASE;" 
    },
    { 
        regex: /src = \http:\/\/localhost:8000\/\$\{src\}\;/g, 
        replace: "src = /;" 
    },
    { 
        regex: /value="http:\/\/localhost:8000\/LISTING_INTERN\/index\.html"/g, 
        replace: 'value="https://brick-stone-frontend.vercel.app/LISTING_INTERN/index.html"' 
    },
    { 
        regex: /href="http:\/\/localhost:8000\/LISTING_INTERN\/index\.html"/g, 
        replace: 'href="https://brick-stone-frontend.vercel.app/LISTING_INTERN/index.html"' 
    },
    { 
        regex: /const link = 'http:\/\/localhost:8000\/LISTING_INTERN\/index\.html';/g, 
        replace: "const link = 'https://brick-stone-frontend.vercel.app/LISTING_INTERN/index.html';" 
    },
    { 
        regex: /'http:\/\/localhost:8000\/FRONTEND\/allproperties\.html\?category='/g, 
        replace: "'https://brick-stone-frontend.vercel.app/FRONTEND/allproperties.html?category='" 
    },
    { 
        regex: /'http:\/\/localhost:8000\/FRONTEND\/allproperties\.html'/g, 
        replace: "'https://brick-stone-frontend.vercel.app/FRONTEND/allproperties.html'" 
    }
];
replaceInFile('ADMIN_PANEL/app.js', adminReplacements);
replaceInFile('ADMIN_PANEL/app.min.js', adminReplacements);

replaceInFile('FRONTEND/script.js', [
    {
        regex: /fetch\(\http:\/\/localhost:5000\/api\/site\/about\\)/g,
        replace: "fetch(${window.ENV.API_URL}/site/about)"
    }
]);

replaceInFile('LISTING_INTERN/app.js', [
    {
        regex: /const API_BASE = 'http:\/\/localhost:5000\/api';/g,
        replace: "const API_BASE = window.ENV ? window.ENV.API_URL : 'https://brickstone-real-estate.onrender.com/api';"
    }
]);

replaceInFile('BACKEND/routes/uploadRoutes.js', [
    {
        regex: /const urls = req\.files\.map\(f => 'http:\/\/localhost:5000\/uploads\/' \+ f\.filename\);/g,
        replace: "const urls = req.files.map(f => ${req.protocol}:///uploads/);"
    }
]);

const backendReplacements = [
    {
        regex: /host: process\.env\.DB_HOST \|\| 'localhost',/g,
        replace: "host: process.env.DB_HOST,"
    }
];
replaceInFile('BACKEND/setup.js', backendReplacements);
replaceInFile('BACKEND/fix_password.js', backendReplacements);

console.log('Replacements complete.');
