const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Running intern migration...');
        
        const q1 = `
            CREATE TABLE IF NOT EXISTS Interns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                intern_id VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(50),
                password_hash VARCHAR(255) NOT NULL,
                territory VARCHAR(255),
                monthly_target INT DEFAULT 0,
                status ENUM('Active', 'Inactive') DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        await pool.query(q1);
        console.log('Created Interns table.');

        const q2 = `
            ALTER TABLE Properties 
                ADD COLUMN intern_id INT NULL,
                ADD COLUMN approval_status ENUM('Draft', 'Submitted', 'Under Review', 'Approved', 'Changes Requested', 'Rejected') DEFAULT 'Approved'
        `;
        // Try altering table, ignore if columns already exist
        try {
            await pool.query(q2);
            console.log('Added intern_id and approval_status to Properties.');
            
            const q2_fk = `
                ALTER TABLE Properties
                ADD CONSTRAINT fk_intern FOREIGN KEY (intern_id) REFERENCES Interns(id) ON DELETE SET NULL
            `;
            await pool.query(q2_fk);
            console.log('Added foreign key fk_intern to Properties.');
        } catch (e) {
            console.log('Properties table might already be altered. Skipping. Error:', e.message);
        }

        const q3 = `
            CREATE TABLE IF NOT EXISTS PropertyReviewNotes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                property_id INT NOT NULL,
                intern_id INT NOT NULL,
                note TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (property_id) REFERENCES Properties(id) ON DELETE CASCADE,
                FOREIGN KEY (intern_id) REFERENCES Interns(id) ON DELETE CASCADE
            )
        `;
        await pool.query(q3);
        console.log('Created PropertyReviewNotes table.');
        
        console.log('Migration successful.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        process.exit();
    }
}
migrate();
