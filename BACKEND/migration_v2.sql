CREATE TABLE IF NOT EXISTS Notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_type ENUM('admin', 'intern') NOT NULL,
    user_id INT NULL,
    title VARCHAR(255),
    message TEXT,
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE Properties ADD COLUMN media JSON NULL;
