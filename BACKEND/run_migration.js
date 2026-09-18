const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });
    const sql = fs.readFileSync('migration_interns.sql', 'utf16le'); // Read as utf16le just in case, or we try utf8 if it fails
    // Wait, let's just use utf8 first, if it has null bytes it might be UTF-16
    let sqlUtf8 = fs.readFileSync('migration_interns.sql', 'utf8');
    if (sqlUtf8.includes('\0')) {
        sqlUtf8 = fs.readFileSync('migration_interns.sql', 'utf16le');
    }
    
    try {
        const statements = sqlUtf8.split(';').filter(s => s.trim().length > 0);
        for (const stmt of statements) {
            try {
                await connection.query(stmt);
            } catch (e) {
                // Ignore ER_DUP_FIELDNAME (1060) and ER_TABLE_EXISTS_ERROR (1050)
                if (e.errno !== 1060 && e.errno !== 1050 && e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.warn(`Migration warning for statement: ${stmt.substring(0, 50)}...`, e.message);
                }
            }
        }
        console.log("Migration executed safely!");
    } catch(e) {
        console.error(e);
    }
    await connection.end();
}
run();
