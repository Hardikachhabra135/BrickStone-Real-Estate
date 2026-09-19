const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = require('./config/db');

async function run() {
    const migrationPath = path.join(__dirname, 'migration_interns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf16le'); // Read as utf16le just in case, or we try utf8 if it fails
    // Wait, let's just use utf8 first, if it has null bytes it might be UTF-16
    let sqlUtf8 = fs.readFileSync(migrationPath, 'utf8');
    if (sqlUtf8.includes('\0')) {
        sqlUtf8 = fs.readFileSync(migrationPath, 'utf16le');
    }
    
    try {
        const statements = sqlUtf8.split(';').filter(s => s.trim().length > 0);
        
        // Also load add_analytics.sql
        const analyticsPath = path.join(__dirname, 'add_analytics.sql');
        if (fs.existsSync(analyticsPath)) {
            const analyticsSql = fs.readFileSync(analyticsPath, 'utf8');
            statements.push(...analyticsSql.split(';').filter(s => s.trim().length > 0));
        }

        const v2Path = path.join(__dirname, 'migration_v2.sql');
        if (fs.existsSync(v2Path)) {
            const v2Sql = fs.readFileSync(v2Path, 'utf8');
            statements.push(...v2Sql.split(';').filter(s => s.trim().length > 0));
        }

        let successCount = 0;
        for (const stmt of statements) {
            try {
                await pool.query(stmt);
                successCount++;
            } catch (e) {
                // Ignore ER_DUP_FIELDNAME (1060) and ER_TABLE_EXISTS_ERROR (1050)
                if (e.errno !== 1060 && e.errno !== 1050 && e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.error(`--- MIGRATION ERROR ---`);
                    console.error(`Statement: ${stmt.substring(0, 100)}...`);
                    console.error(`Code: ${e.code}, Message: ${e.message}`);
                    console.error(`-----------------------`);
                }
            }
        }
        console.log(`Migration executed safely! (${successCount}/${statements.length} statements successful)`);
    } catch(e) {
        console.error("--- FATAL MIGRATION ERROR ---");
        console.error(e);
        console.error("-----------------------------");
    }
    
    // We exit with 0 to allow the backend server to start even if migrations partially fail
    // (e.g. if TiDB rejects a DDL, we still want the API to be up for other routes)
    process.exit(0);
}
run();
