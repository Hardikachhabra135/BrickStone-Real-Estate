CREATE TABLE IF NOT EXISTS analytics_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    page VARCHAR(255) NOT NULL,
    property_id INT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(100) NOT NULL,
    device_type VARCHAR(20) DEFAULT 'desktop',
    referrer VARCHAR(255) NULL,
    metadata JSON NULL
);
