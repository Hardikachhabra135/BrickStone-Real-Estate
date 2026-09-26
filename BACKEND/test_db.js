const pool = require('./config/db');
async function run() {
    try {
        const [rows] = await pool.query('SELECT * FROM Properties ORDER BY id DESC LIMIT 1');
        console.log(rows);
    } catch(e) { console.error(e); }
    process.exit();
}
run();
