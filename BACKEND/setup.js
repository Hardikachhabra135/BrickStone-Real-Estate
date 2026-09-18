const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
    console.log("Connecting to TiDB Server...");
    
    // Connect without specifying a database first
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL_MODE === 'true' ? { rejectUnauthorized: true } : undefined,
    });

    try {
        console.log("Creating database 'real_estate_db'...");
        await connection.query(`CREATE DATABASE IF NOT EXISTS real_estate_db;`);
        
        console.log("Switching to 'real_estate_db'...");
        await connection.query(`USE real_estate_db;`);

        console.log("Creating tables...");
        
        // Properties
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Properties (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                price VARCHAR(100),
                location VARCHAR(255),
                badge VARCHAR(100),
                image VARCHAR(255),
                specs JSON,
                is_verified BOOLEAN DEFAULT FALSE,
                status ENUM('Available', 'Sold', 'Rented') DEFAULT 'Available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);

        // PropertyEnquiries
        await connection.query(`
            CREATE TABLE IF NOT EXISTS PropertyEnquiries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                property_id VARCHAR(255) NOT NULL,
                property_title VARCHAR(255),
                phone VARCHAR(50),
                email VARCHAR(255),
                status ENUM('New', 'Contacted', 'Resolved') DEFAULT 'New',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ContactSubmissions
        await connection.query(`
            CREATE TABLE IF NOT EXISTS ContactSubmissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                message TEXT,
                extra_details JSON,
                status ENUM('New', 'Contacted', 'Resolved') DEFAULT 'New',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Analytics
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Analytics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                website_clicks INT DEFAULT 0
            );
        `);
        await connection.query(`INSERT INTO Analytics (website_clicks) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM Analytics);`);

        // Users
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'staff') DEFAULT 'staff',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await connection.query(`
            INSERT INTO Users (username, password_hash, role) 
            SELECT 'admin', '$2b$10$vznab1pGKrcXNKnioaJouoodGdKqWWghRf4KiS83dD5gp/qrLFRO', 'admin' 
            WHERE NOT EXISTS (SELECT 1 FROM Users WHERE username = 'admin');
        `);

        console.log("Database and tables created successfully!");

        // Run seed.sql if it exists
        try {
            console.log("Running seed data...");
            // Seed properties
            await connection.query(`
                INSERT INTO Properties (title, description, price, location, badge, image, specs, is_verified, status)
                SELECT 'Luxury Villa', 'Beautiful luxury villa in the hills.', '$1,200,000', 'Beverly Hills', 'For Sale', 'images/villa.jpg', '["4 Beds", "3 Baths", "3000 sqft"]', true, 'Available'
                WHERE NOT EXISTS (SELECT 1 FROM Properties WHERE title = 'Luxury Villa');
            `);
            
            // Seed contacts (to test the Read More button)
            await connection.query(`
                INSERT INTO ContactSubmissions (name, email, phone, message, extra_details, status)
                SELECT 'Test User', 'test@example.com', '1234567890', 'This is a very long message that should definitely trigger the Read More button in the UI because it exceeds thirty characters easily!', '{"source":"web"}', 'New'
                WHERE NOT EXISTS (SELECT 1 FROM ContactSubmissions WHERE name = 'Test User');
            `);
            console.log("Seed data inserted!");
        } catch(e) {
            console.log("Could not seed data:", e.message);
        }

    } catch (error) {
        console.error("Setup failed:", error);
    } finally {
        await connection.end();
        console.log("Done.");
    }
}

setupDatabase();
