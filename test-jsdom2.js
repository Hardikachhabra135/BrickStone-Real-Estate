const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function run() {
    const html = fs.readFileSync('FRONTEND/allproperties.html', 'utf8');
    const dom = new JSDOM(html, { 
        url: "http://localhost:8000/FRONTEND/allproperties.html?category=2BHK&v=fresh_load",
        runScripts: "dangerously",
        resources: "usable"
    });
    const window = dom.window;

    // Mock fetch BEFORE scripts execute
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
    window.ENV = { API_URL: 'http://localhost:5000/api' };

    await new Promise(r => setTimeout(r, 2000));
    
    const countLabel = window.document.getElementById('count-label');
    console.log("Count Label:", countLabel ? countLabel.textContent : "Not found");
}
run();
