const fs = require('fs');

function replaceInFileStr(path, search, replace) {
    if(!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    content = content.split(search).join(replace);
    fs.writeFileSync(path, content, 'utf8');
}

replaceInFileStr('ADMIN_PANEL/app.js', "const base = isLocalEndpoint ? 'http://localhost:5000/api' : API_BASE;", "const base = API_BASE;");
replaceInFileStr('ADMIN_PANEL/app.min.js', "const base = isLocalEndpoint ? 'http://localhost:5000/api' : API_BASE;", "const base = API_BASE;");

replaceInFileStr('ADMIN_PANEL/app.js', "src = http://localhost:8000/\;", "src = /\;");
replaceInFileStr('ADMIN_PANEL/app.min.js', "src = http://localhost:8000/\;", "src = /\;");

replaceInFileStr('ADMIN_PANEL/app.js', "value=\"http://localhost:8000/LISTING_INTERN/index.html\"", "value=\"https://brick-stone-frontend.vercel.app/LISTING_INTERN/index.html\"");
replaceInFileStr('ADMIN_PANEL/app.min.js', "value=\"http://localhost:8000/LISTING_INTERN/index.html\"", "value=\"https://brick-stone-frontend.vercel.app/LISTING_INTERN/index.html\"");

replaceInFileStr('ADMIN_PANEL/app.js', "href=\"http://localhost:8000/LISTING_INTERN/index.html\"", "href=\"https://brick-stone-frontend.vercel.app/LISTING_INTERN/index.html\"");
replaceInFileStr('ADMIN_PANEL/app.min.js', "href=\"http://localhost:8000/LISTING_INTERN/index.html\"", "href=\"https://brick-stone-frontend.vercel.app/LISTING_INTERN/index.html\"");

replaceInFileStr('ADMIN_PANEL/app.js', "const link = 'http://localhost:8000/LISTING_INTERN/index.html';", "const link = 'https://brick-stone-frontend.vercel.app/LISTING_INTERN/index.html';");
replaceInFileStr('ADMIN_PANEL/app.min.js', "const link = 'http://localhost:8000/LISTING_INTERN/index.html';", "const link = 'https://brick-stone-frontend.vercel.app/LISTING_INTERN/index.html';");

replaceInFileStr('ADMIN_PANEL/app.js', "'http://localhost:8000/FRONTEND/allproperties.html?category='", "'https://brick-stone-frontend.vercel.app/FRONTEND/allproperties.html?category='");
replaceInFileStr('ADMIN_PANEL/app.min.js', "'http://localhost:8000/FRONTEND/allproperties.html?category='", "'https://brick-stone-frontend.vercel.app/FRONTEND/allproperties.html?category='");

replaceInFileStr('ADMIN_PANEL/app.js', "'http://localhost:8000/FRONTEND/allproperties.html'", "'https://brick-stone-frontend.vercel.app/FRONTEND/allproperties.html'");
replaceInFileStr('ADMIN_PANEL/app.min.js', "'http://localhost:8000/FRONTEND/allproperties.html'", "'https://brick-stone-frontend.vercel.app/FRONTEND/allproperties.html'");

replaceInFileStr('FRONTEND/script.js', "fetch(http://localhost:5000/api/site/about)", "fetch(${window.ENV.API_URL}/site/about)");

replaceInFileStr('LISTING_INTERN/app.js', "const API_BASE = 'http://localhost:5000/api';", "const API_BASE = window.ENV ? window.ENV.API_URL : 'https://brickstone-real-estate.onrender.com/api';");

replaceInFileStr('BACKEND/routes/uploadRoutes.js', "const urls = req.files.map(f => 'http://localhost:5000/uploads/' + f.filename);", "const urls = req.files.map(f => https://brickstone-real-estate.onrender.com/uploads/);");

replaceInFileStr('BACKEND/setup.js', "host: process.env.DB_HOST || 'localhost',", "host: process.env.DB_HOST,");
replaceInFileStr('BACKEND/fix_password.js', "host: process.env.DB_HOST || 'localhost',", "host: process.env.DB_HOST,");

console.log('Replacements complete.');
