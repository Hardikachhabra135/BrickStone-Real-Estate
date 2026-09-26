const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const fs = require('fs');
        const path = require('path');
        const internsPath = path.join(__dirname, '../interns.json');
        
        let interns = [];
        if (fs.existsSync(internsPath)) {
            interns = JSON.parse(fs.readFileSync(internsPath, 'utf8'));
        }
        
        const intern = interns.find(i => i.intern_id === username || i.email === username);
        
        if (!intern) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (intern.status !== 'Active' && intern.status !== 'ACTIVE') {
            return res.status(403).json({ success: false, message: 'Account is deactivated. Contact admin.' });
        }

        const match = await bcrypt.compare(password, intern.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: intern.id, intern_id: intern.intern_id, email: intern.email, role: 'intern' },
            process.env.JWT_SECRET || 'brickstone_secret_key',
            { expiresIn: '24h' }
        );

        res.json({ success: true, token, intern: { id: intern.id, name: intern.name, intern_id: intern.intern_id, territory: intern.territory } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const internsPath = path.join(__dirname, '../interns.json');
        let interns = [];
        if (fs.existsSync(internsPath)) {
            interns = JSON.parse(fs.readFileSync(internsPath, 'utf8'));
        }
        
        const intern = interns.find(i => i.id === String(req.intern.id) || i.intern_id === String(req.intern.id));
        if (!intern) return res.status(404).json({ success: false, message: 'Intern not found' });
        
        const stats = {
            total_properties: 0,
            pending_properties: 0,
            approved_properties: 0,
            changes_requested: 0,
            rejected_properties: 0
        };

        res.json({ success: true, intern: intern, stats: stats });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch details' });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const [notifications] = await pool.query(
            'SELECT * FROM Notifications WHERE user_type = "intern" AND user_id = ? ORDER BY created_at DESC LIMIT 50', 
            [req.intern.id]
        );
        res.json({ success: true, data: notifications });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};

exports.getProperties = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const listingsPath = path.join(__dirname, '../intern_listings.json');
        let properties = [];
        if (fs.existsSync(listingsPath)) {
            let listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
            properties = listings.filter(p => String(p.intern_id) === String(req.intern.intern_id || req.intern.id));
        }
        res.json({ success: true, data: properties });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch properties' });
    }
};

exports.getPropertyById = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const listingsPath = path.join(__dirname, '../intern_listings.json');
        if (fs.existsSync(listingsPath)) {
            let listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
            const prop = listings.find(p => p.id === req.params.id && String(p.intern_id) === String(req.intern.intern_id || req.intern.id));
            if (prop) {
                return res.json({ success: true, property: prop, notes: [] });
            }
        }
        res.status(404).json({ success: false, message: 'Property not found' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch property' });
    }
};

exports.createProperty = async (req, res) => {
    try {
        const { title, description, price, location, badge, image, specs, media } = req.body;
        const fs = require('fs');
        const path = require('path');
        const listingsPath = path.join(__dirname, '../intern_listings.json');
        
        let listings = [];
        if (fs.existsSync(listingsPath)) {
            listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
        }
        
        const newProperty = {
            id: 'BRK-L-' + Math.floor(Math.random() * 9000 + 1000),
            intern_id: String(req.intern.intern_id || req.intern.id),
            title: title || '',
            description: description || '',
            price: price || '',
            location: location || '',
            badge: badge || '',
            image: image || '',
            specs: specs || {},
            media: media || { photos: [], video: '' },
            approval_status: 'Draft',
            status: 'DRAFT',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        listings.push(newProperty);
        fs.writeFileSync(listingsPath, JSON.stringify(listings, null, 2));
        
        res.status(201).json({ success: true, message: 'Property created as Draft', property_id: newProperty.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create property' });
    }
};

exports.updateProperty = async (req, res) => {
    try {
        const { title, description, price, location, badge, image, specs, media } = req.body;
        const fs = require('fs');
        const path = require('path');
        const listingsPath = path.join(__dirname, '../intern_listings.json');
        
        if (fs.existsSync(listingsPath)) {
            let listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
            const propId = req.params.id;
            const prop = listings.find(p => p.id === propId && String(p.intern_id) === String(req.intern.intern_id || req.intern.id));
            if (prop) {
                if (['Under Review', 'Approved'].includes(prop.approval_status)) {
                    return res.status(403).json({ success: false, message: 'Cannot edit property in this status' });
                }
                prop.title = title || prop.title;
                prop.description = description || prop.description;
                prop.price = price || prop.price;
                prop.location = location || prop.location;
                prop.badge = badge || prop.badge;
                prop.image = image || prop.image;
                prop.specs = specs || prop.specs;
                prop.media = media || prop.media;
                prop.updated_at = new Date().toISOString();
                fs.writeFileSync(listingsPath, JSON.stringify(listings, null, 2));
                return res.json({ success: true, message: 'Property updated' });
            }
        }
        res.status(404).json({ success: false, message: 'Property not found' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update property' });
    }
};

exports.submitProperty = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const listingsPath = path.join(__dirname, '../intern_listings.json');
        if (fs.existsSync(listingsPath)) {
            let listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
            const propId = req.params.id;
            const prop = listings.find(p => p.id === propId && String(p.intern_id) === String(req.intern.intern_id || req.intern.id));
            if (prop) {
                prop.approval_status = "Under Review";
                prop.status = "SUBMITTED";
                fs.writeFileSync(listingsPath, JSON.stringify(listings, null, 2));
                return res.json({ success: true, message: 'Property submitted for review' });
            }
        }
        res.status(404).json({ success: false, message: 'Property not found' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to submit property' });
    }
};

exports.resubmitProperty = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const listingsPath = path.join(__dirname, '../intern_listings.json');
        if (fs.existsSync(listingsPath)) {
            let listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
            const propId = req.params.id;
            const prop = listings.find(p => p.id === propId && String(p.intern_id) === String(req.intern.intern_id || req.intern.id));
            if (prop) {
                if (prop.approval_status !== 'Changes Requested') {
                    return res.status(400).json({ success: false, message: 'Property is not in Changes Requested state' });
                }
                prop.approval_status = "Under Review";
                prop.status = "SUBMITTED";
                prop.updated_at = new Date().toISOString();
                fs.writeFileSync(listingsPath, JSON.stringify(listings, null, 2));
                return res.json({ success: true, message: 'Property resubmitted for review' });
            }
        }
        res.status(404).json({ success: false, message: 'Property not found' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to resubmit property' });
    }
};

exports.deleteListing = async (req, res) => {
    try {
        const [props] = await pool.query('SELECT approval_status FROM Properties WHERE id = ? AND intern_id = ?', [req.params.id, req.intern.id]);
        if (!props.length) return res.status(404).json({ success: false, message: 'Property not found or access denied.' });
        
        const status = props[0].approval_status;
        if (status === 'Approved' || status === 'Published') {
            return res.status(403).json({ success: false, message: 'Cannot delete a published or approved listing. Please contact admin.' });
        }

        await pool.query('DELETE FROM Properties WHERE id = ? AND intern_id = ?', [req.params.id, req.intern.id]);
        res.json({ success: true, message: 'Listing deleted successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete listing.' });
    }
};

exports.getChat = async (req, res) => {
    try {
        const [conversations] = await pool.query('SELECT * FROM Conversations WHERE intern_id = ?', [req.intern.id]);
        if (!conversations.length) {
            return res.json({ success: true, messages: [] });
        }
        
        const conversationId = conversations[0].id;
        
        // Mark as read
        await pool.query('UPDATE Messages SET is_read = TRUE WHERE conversation_id = ? AND sender_type = "admin"', [conversationId]);
        
        const [messages] = await pool.query('SELECT * FROM Messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);
        res.json({ success: true, messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load chat' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

        let [conversations] = await pool.query('SELECT * FROM Conversations WHERE intern_id = ?', [req.intern.id]);
        let conversationId;
        
        if (!conversations.length) {
            const [result] = await pool.query('INSERT INTO Conversations (intern_id) VALUES (?)', [req.intern.id]);
            conversationId = result.insertId;
        } else {
            conversationId = conversations[0].id;
            await pool.query('UPDATE Conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);
        }
        
        await pool.query(
            'INSERT INTO Messages (conversation_id, sender_type, sender_id, message) VALUES (?, "intern", ?, ?)',
            [conversationId, req.intern.id, message]
        );
        
        res.json({ success: true, message: 'Message sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
};
