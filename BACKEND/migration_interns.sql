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
);

-- Note: In TiDB/MySQL, altering ENUM values requires some care, but adding new columns is fine.
-- Using 'Approved' as default so existing public properties are not hidden.
ALTER TABLE Properties 
    ADD COLUMN intern_id INT NULL,
    ADD COLUMN approval_status ENUM('Draft', 'Submitted', 'Under Review', 'Approved', 'Changes Requested', 'Rejected') DEFAULT 'Approved',
    ADD CONSTRAINT fk_intern FOREIGN KEY (intern_id) REFERENCES Interns(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS PropertyReviewNotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    intern_id INT NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES Properties(id) ON DELETE CASCADE,
    FOREIGN KEY (intern_id) REFERENCES Interns(id) ON DELETE CASCADE
);
