const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function migrate() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'add_analytics.sql'), 'utf8');
        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration successful.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        process.exit();
    }
}
migrate();
