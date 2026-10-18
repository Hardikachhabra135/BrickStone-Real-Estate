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
        if (error.code === 'ECONNREFUSED' || error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_ACCESS_DENIED_ERROR') {
            return res.status(200).json({ success: true, data: memoryContent || defaultAboutContent });
        }
        console.error('Error fetching about content:', error);
        return res.status(200).json({ success: true, data: memoryContent || defaultAboutContent });
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

// --- Testimonials Controller Methods ---
const fs = require('fs');
const path = require('path');
const testimonialsFilePath = path.join(__dirname, '../testimonials.json');

const defaultTestimonials = [
    {
        id: "bt-1",
        name: "Aarav Malhotra",
        role: "DLF Magnolias, Gurugram",
        serviceType: "BUYING",
        rating: 4,
        quote: "Brickstone secured an off-market penthouse for our family within three weeks. Complete discretion, swift closing, and peerless market insight.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        isActive: true,
        status: "PUBLISHED"
    },
    {
        id: "bt-2",
        name: "Ananya Srivastava",
        role: "Jor Bagh, New Delhi",
        serviceType: "SELLING",
        rating: 5,
        quote: "Their white-glove advisory navigated title due diligence and high-net-worth negotiations seamlessly. The benchmark for luxury estate consultancy.",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        isActive: true,
        status: "PUBLISHED"
    },
    {
        id: "bt-3",
        name: "Rohan Khurana",
        role: "Tagore Garden",
        serviceType: "BUYING",
        rating: 5,
        quote: "Acquiring a heritage property in Central Delhi felt impossible until Brickstone stepped in. Truly refined client hospitality from start to finish.",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        isActive: true,
        status: "PUBLISHED"
    },
    {
        id: "bt-4",
        name: "Roshni Khanna",
        role: "Rajouri Garden",
        serviceType: "SELLING",
        rating: 5,
        quote: "From initial lease terms to key handover, their attention to architectural detail and contract safety was remarkable.",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        isActive: true,
        status: "PUBLISHED"
    },
    {
        id: "bt-5",
        name: "Yuvraj Chhabra",
        role: "Lajpat Nagar, New Delhi",
        serviceType: "SELLING",
        rating: 5,
        quote: "Exceptional insight on prime asset acquisition. They provided clear comparative analyses that saved us months of speculative viewings.",
        image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
        isActive: true,
        status: "PUBLISHED"
    }
];

function loadLocalTestimonials() {
    if (fs.existsSync(testimonialsFilePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(testimonialsFilePath, 'utf8'));
            if (Array.isArray(data) && data.length > 0) return data;
        } catch (e) {
            console.error('Error reading testimonials.json:', e);
        }
    }
    try {
        fs.writeFileSync(testimonialsFilePath, JSON.stringify(defaultTestimonials, null, 2), 'utf8');
    } catch (e) {}
    return defaultTestimonials;
}

exports.getTestimonials = async (req, res) => {
    try {
        let testimonials = null;

        // Try DB first
        try {
            const [rows] = await pool.query("SELECT content FROM SiteSettings WHERE section_key = 'testimonials'");
            if (rows.length > 0 && rows[0].content) {
                testimonials = typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content;
            }
        } catch (dbErr) {
            // DB not available or table missing, use local file fallback
        }

        if (!testimonials || !Array.isArray(testimonials)) {
            testimonials = loadLocalTestimonials();
        }

        // Normalize image fields for all items
        const normalized = testimonials.map(t => ({
            ...t,
            image: t.image || t.image_url || t.imageUrl || t.photo || t.avatar || ''
        }));

        // Return all for admin panel (?all=true or ?status=all), or filter published for public website
        const showAll = req.query.all === 'true' || req.query.status === 'all';
        if (showAll) {
            return res.status(200).json({ success: true, data: normalized });
        }

        const published = normalized.filter(t => t.isActive === true || t.status === 'PUBLISHED' || t.status === 'Active');
        return res.status(200).json({ success: true, data: published });
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateTestimonials = async (req, res) => {
    try {
        const updatedList = req.body;
        if (!Array.isArray(updatedList)) {
            return res.status(400).json({ success: false, message: 'Body must be an array of testimonials' });
        }

        // Normalize image field on every item
        const sanitizedList = updatedList.map(t => {
            const img = t.image || t.image_url || t.imageUrl || t.photo || t.avatar || '';
            return {
                ...t,
                image: img
            };
        });

        // 1. Save to JSON file for guaranteed persistence
        try {
            fs.writeFileSync(testimonialsFilePath, JSON.stringify(sanitizedList, null, 2), 'utf8');
        } catch (fsErr) {
            console.error('Failed to write testimonials.json:', fsErr);
        }

        // 2. Persist to DB if available
        try {
            const [existing] = await pool.query("SELECT id FROM SiteSettings WHERE section_key = 'testimonials'");
            if (existing.length > 0) {
                await pool.query("UPDATE SiteSettings SET content = ? WHERE section_key = 'testimonials'", [JSON.stringify(sanitizedList)]);
            } else {
                await pool.query("INSERT INTO SiteSettings (section_key, content) VALUES ('testimonials', ?)", [JSON.stringify(sanitizedList)]);
            }
        } catch (dbErr) {
            console.log('Database update skipped or failed, saved to JSON file fallback:', dbErr.message);
        }

        res.status(200).json({ success: true, message: 'Testimonials updated successfully', data: sanitizedList });
    } catch (error) {
        console.error('Error updating testimonials:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateSingleTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        let testimonials = loadLocalTestimonials();

        // Check DB first if present
        try {
            const [rows] = await pool.query("SELECT content FROM SiteSettings WHERE section_key = 'testimonials'");
            if (rows.length > 0 && rows[0].content) {
                testimonials = typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content;
            }
        } catch (e) {}

        const index = testimonials.findIndex(t => String(t.id) === String(id));
        const img = updates.image || updates.image_url || updates.imageUrl || updates.photo || updates.avatar;
        const normalizedUpdates = { ...updates };
        if (img !== undefined) {
            normalizedUpdates.image = img;
        }

        if (index !== -1) {
            testimonials[index] = { ...testimonials[index], ...normalizedUpdates, id: testimonials[index].id };
        } else {
            testimonials.push({ id: id || 'bt-' + Date.now(), ...normalizedUpdates });
        }

        // Save to file
        try {
            fs.writeFileSync(testimonialsFilePath, JSON.stringify(testimonials, null, 2), 'utf8');
        } catch (e) {}

        // Save to DB
        try {
            const [existing] = await pool.query("SELECT id FROM SiteSettings WHERE section_key = 'testimonials'");
            if (existing.length > 0) {
                await pool.query("UPDATE SiteSettings SET content = ? WHERE section_key = 'testimonials'", [JSON.stringify(testimonials)]);
            } else {
                await pool.query("INSERT INTO SiteSettings (section_key, content) VALUES ('testimonials', ?)", [JSON.stringify(testimonials)]);
            }
        } catch (e) {}

        res.status(200).json({ success: true, message: 'Testimonial updated successfully', data: testimonials });
    } catch (error) {
        console.error('Error updating single testimonial:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

