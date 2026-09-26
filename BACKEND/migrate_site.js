
const pool = require('./config/db');

async function migrate() {
    try {
        await pool.query('CREATE TABLE IF NOT EXISTS SiteSettings (id INT AUTO_INCREMENT PRIMARY KEY, section_key VARCHAR(50) UNIQUE NOT NULL, content JSON NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, updated_by VARCHAR(255))');
        
        const defaultAbout = {
            heading: 'About Brickstone',
            subheading: 'More than a property. A place to belong.',
            description: 'Brickstone connects you with carefully selected spaces defined by character, comfort, and convenience. From finding a new home to discovering your next opportunity, we make every search feel simpler and more considered.',
            closing_line: 'Find your space. Make it yours.',
            image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop'
        };
        
        await pool.query('INSERT IGNORE INTO SiteSettings (section_key, content) VALUES (?, ?)', ['about', JSON.stringify(defaultAbout)]);
        
        console.log('Migration successful');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();

