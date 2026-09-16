const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST ? process.env.DB_HOST.trim() : 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER ? process.env.DB_USER.trim() : 'root',
    password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : '',
    database: process.env.DB_NAME ? process.env.DB_NAME.trim() : 'real_estate_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Configure SSL for TiDB Cloud / Production
if (process.env.DB_SSL === 'true') {
    dbConfig.ssl = {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
        servername: process.env.DB_HOST ? process.env.DB_HOST.trim() : undefined
    };
    
    // If a CA cert path is provided via environment variable (e.g. Render Secret File)
    if (process.env.CA_CERT_PATH) {
        dbConfig.ssl.ca = fs.readFileSync(process.env.CA_CERT_PATH);
    }
}

const pool = mysql.createPool(dbConfig);


module.exports = pool;
