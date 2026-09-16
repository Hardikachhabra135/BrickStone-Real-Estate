const pool = require('../config/db');

const defaultAboutContent = {
    heading: 'About Brickstone',
    subheading: 'More than a property. A place to belong.',
    description: 'Brickstone connects you with carefully selected spaces defined by character, comfort, and convenience. From finding a new home to discovering your next opportunity, we make every search feel simpler and more considered.',
    closing_line: 'Find your space. Make it yours.',
    image_url: 'images/about.jpg'
};

exports.getAboutContent = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT content FROM SiteSettings WHERE section_key = 'about'");
        if (rows.length > 0) {
            return res.status(200).json({ success: true, data: rows[0].content });
        }
        res.status(200).json({ success: true, data: memoryContent || defaultAboutContent });
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(200).json({ success: true, data: memoryContent || defaultAboutContent });
        }
        console.error('Error fetching about content:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

let memoryContent = null; // Stores in-memory updates when DB is down

exports.updateAboutContent = async (req, res) => {
    try {
        const updates = req.body;
        
        // Fetch existing or use default
        let current = memoryContent || defaultAboutContent;
        
        try {
            const [existing] = await pool.query("SELECT content FROM SiteSettings WHERE section_key = 'about'");
            if (existing.length > 0) {
                current = existing[0].content;
                if (typeof current === 'string') current = JSON.parse(current);
            }
            
            const newContent = { ...current, ...updates };

            if (existing.length > 0) {
                await pool.query("UPDATE SiteSettings SET content = ? WHERE section_key = 'about'", [JSON.stringify(newContent)]);
            } else {
                await pool.query("INSERT INTO SiteSettings (section_key, content) VALUES ('about', ?)", [JSON.stringify(newContent)]);
            }
            
            memoryContent = newContent;
            return res.status(200).json({ success: true, message: 'About section updated successfully', data: newContent });
        } catch (dbError) {
            if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ER_NO_SUCH_TABLE') {
                const newContent = { ...current, ...updates };
                memoryContent = newContent;
                return res.status(200).json({ success: true, message: 'Updated in memory', data: newContent });
            }
            throw dbError;
        }
    } catch (error) {
        console.error('Error updating about content:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
