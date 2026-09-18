const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixPassword() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'real_estate_db',
        ssl: process.env.DB_SSL_MODE === 'true' ? { rejectUnauthorized: true } : undefined,
    });

    try {
        console.log("Generating hash for 'admin123'...");
        const hash = await bcrypt.hash('admin123', 10);
        
        console.log("Updating password in DB...");
        await connection.query(`UPDATE Users SET password_hash = ? WHERE username = 'admin'`, [hash]);
        console.log("Password updated to admin123 successfully!");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await connection.end();
    }
}
fixPassword();
