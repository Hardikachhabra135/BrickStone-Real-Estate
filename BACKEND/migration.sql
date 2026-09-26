USE real_estate_db;

CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff') DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Users (username, password_hash, role) 
SELECT 'admin', '$2b$10$vznaub1pGKrcXNKnioaJouoodGdKqWWghRf4KiS83dD5gp/qrLFRO', 'admin' 
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE username = 'admin');

ALTER TABLE Properties ADD COLUMN status ENUM('Available', 'Sold', 'Rented') DEFAULT 'Available';
ALTER TABLE PropertyEnquiries ADD COLUMN status ENUM('New', 'Contacted', 'Resolved') DEFAULT 'New';
ALTER TABLE ContactSubmissions ADD COLUMN status ENUM('New', 'Contacted', 'Resolved') DEFAULT 'New';
