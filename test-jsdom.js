const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function run() {
    const html = fs.readFileSync('FRONTEND/allproperties.html', 'utf8');
    const dom = new JSDOM(html, { url: "http://localhost:8000/FRONTEND/allproperties.html?category=2BHK&v=fresh_load" });
    const window = dom.window;
    const document = window.document;

    // Mock fetch
    window.fetch = async (url) => {
        const propertiesJson = fs.readFileSync('BACKEND/properties.json', 'utf8');
        const db = JSON.parse(propertiesJson);
        const properties = db.map(row => ({
            ...row,
            specs: typeof row.specs === 'string' ? JSON.parse(row.specs) : (row.specs || [])
        }));
        return {
            ok: true,
            json: async () => ({ success: true, data: properties })
        };
    };

    // Inject scripts
    const script = fs.readFileSync('FRONTEND/script.js', 'utf8');
    const scriptEl = document.createElement('script');
    scriptEl.textContent = script;
    document.body.appendChild(scriptEl);

    // Wait a bit for async logic
    await new Promise(r => setTimeout(r, 1000));
    
    const countLabel = document.getElementById('count-label');
    console.log("Count Label:", countLabel ? countLabel.textContent : "Not found");
}
run();
