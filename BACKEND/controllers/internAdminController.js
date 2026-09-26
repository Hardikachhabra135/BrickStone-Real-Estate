const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Portal URL helper — localhost vs production
const PORTAL_URL = process.env.INTERN_PORTAL_URL || 'http://localhost:8081/index.html';

exports.createIntern = async (req, res) => {
    try {
        const { name, intern_id, password, email, phone, territory, monthly_target } = req.body;
        const password_hash = await bcrypt.hash(password, 10);
        
        const fs = require('fs');
        const path = require('path');
        const internsPath = path.join(__dirname, '../interns.json');
        
        let interns = [];
        if (fs.existsSync(internsPath)) {
            interns = JSON.parse(fs.readFileSync(internsPath, 'utf8'));
        }
        
        if (interns.some(i => i.email === email || i.intern_id === intern_id)) {
            return res.status(400).json({ success: false, message: 'Intern ID or Email already exists' });
        }
        
        const newIntern = {
            id: Date.now().toString(),
            name,
            intern_id,
            email,
            phone: phone || '',
            password_hash,
            territory: territory || '',
            monthly_target: monthly_target || 0,
            status: 'ACTIVE',
            created_at: new Date().toISOString()
        };
        
        interns.push(newIntern);
        fs.writeFileSync(internsPath, JSON.stringify(interns, null, 2));
        
        res.status(201).json({ success: true, message: 'Intern created successfully', intern_id: newIntern.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create intern' });
    }
};

exports.getInterns = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const internsPath = path.join(__dirname, '../interns.json');
        let interns = [];
        if (fs.existsSync(internsPath)) {
            interns = JSON.parse(fs.readFileSync(internsPath, 'utf8'));
        }
        res.json({ success: true, data: interns });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch interns' });
    }
};

exports.getInternById = async (req, res) => {
    try {
        const [intern] = await pool.query('SELECT id, name, intern_id, email, phone, territory, monthly_target, status, created_at FROM Interns WHERE id = ?', [req.params.id]);
        if (!intern.length) return res.status(404).json({ success: false, message: 'Intern not found' });
        res.json({ success: true, intern: intern[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch intern' });
    }
};

exports.updateIntern = async (req, res) => {
    try {
        const { name, email, phone, territory, monthly_target } = req.body;
        await pool.query(
            'UPDATE Interns SET name=?, email=?, phone=?, territory=?, monthly_target=? WHERE id=?',
            [name, email, phone, territory, monthly_target, req.params.id]
        );
        res.json({ success: true, message: 'Intern updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update intern' });
    }
};

exports.updateInternStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const fs = require('fs');
        const path = require('path');
        const internsPath = path.join(__dirname, '../interns.json');
        if (fs.existsSync(internsPath)) {
            let interns = JSON.parse(fs.readFileSync(internsPath, 'utf8'));
            const internIdParam = req.params.id;
            const intern = interns.find(i => i.intern_id === internIdParam || i.id === internIdParam);
            if (intern) {
                intern.status = status;
                fs.writeFileSync(internsPath, JSON.stringify(interns, null, 2));
            }
        }
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

exports.deleteIntern = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const internsPath = path.join(__dirname, '../interns.json');
        if (fs.existsSync(internsPath)) {
            let interns = JSON.parse(fs.readFileSync(internsPath, 'utf8'));
            const internIdParam = req.params.id;
            const index = interns.findIndex(i => i.intern_id === internIdParam || i.id === internIdParam);
            if (index !== -1) {
                interns.splice(index, 1);
                fs.writeFileSync(internsPath, JSON.stringify(interns, null, 2));
            } else {
                return res.status(404).json({ success: false, message: 'Intern not found' });
            }
        }
        res.json({
            success: true,
            message: 'Intern deleted successfully.',
            published_count: 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to deactivate intern' });
    }
};

exports.resetInternPassword = async (req, res) => {
    try {
        const { new_password } = req.body;
        if (!new_password) return res.status(400).json({ success: false, message: 'New password required' });
        
        const fs = require('fs');
        const path = require('path');
        const internsPath = path.join(__dirname, '../interns.json');
        
        if (fs.existsSync(internsPath)) {
            let interns = JSON.parse(fs.readFileSync(internsPath, 'utf8'));
            const internIdParam = req.params.id;
            const intern = interns.find(i => i.intern_id === internIdParam || i.id === internIdParam);
            if (intern) {
                const bcrypt = require('bcryptjs');
                intern.password_hash = await bcrypt.hash(new_password, 10);
                fs.writeFileSync(internsPath, JSON.stringify(interns, null, 2));
                return res.json({ success: true, message: 'Password reset successful' });
            }
        }
        return res.status(404).json({ success: false, message: 'Intern not found' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
};

exports.getInternProperties = async (req, res) => {
    try {
        // Verify intern exists
        const [intern] = await pool.query(
            'SELECT id, name, intern_id, territory, monthly_target FROM Interns WHERE id = ?',
            [req.params.id]
        );
        if (!intern.length) return res.status(404).json({ success: false, message: 'Intern not found' });

        const [properties] = await pool.query(
            `SELECT p.*, 
             (SELECT note FROM PropertyReviewNotes WHERE property_id = p.id ORDER BY created_at DESC LIMIT 1) as latest_review_note
             FROM Properties p
             WHERE p.intern_id = ?
             ORDER BY p.created_at DESC`,
            [req.params.id]
        );

        // Count stats
        const stats = {
            total: properties.length,
            pending: properties.filter(p => p.approval_status === 'Under Review').length,
            changes_requested: properties.filter(p => p.approval_status === 'Changes Requested').length,
            approved: properties.filter(p => p.approval_status === 'Approved').length,
            published: properties.filter(p => p.approval_status === 'Published').length,
            drafts: properties.filter(p => p.approval_status === 'Draft').length
        };

        res.json({ success: true, data: properties, intern: intern[0], stats });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch properties' });
    }
};

exports.updateInternListing = async (req, res) => {
    try {
        const { title, description, price, location, badge, image, specs, media } = req.body;

        // Verify property exists
        const [prop] = await pool.query('SELECT id, intern_id, approval_status, title FROM Properties WHERE id = ?', [req.params.id]);
        if (!prop.length) return res.status(404).json({ success: false, message: 'Property not found' });

        await pool.query(
            'UPDATE Properties SET title=?, description=?, price=?, location=?, badge=?, image=?, specs=?, media=?, updated_at=NOW() WHERE id=?',
            [
                title || prop[0].title,
                description,
                price,
                location,
                badge || 'New',
                image,
                JSON.stringify(specs || {}),
                JSON.stringify(media || { photos: [], video: '' }),
                req.params.id
            ]
        );

        // Notify intern if property has an owner
        if (prop[0].intern_id) {
            await pool.query(
                'INSERT INTO Notifications (user_type, user_id, title, message, link) VALUES ("intern", ?, "Listing Updated", ?, ?)',
                [prop[0].intern_id, `Admin updated your listing "${title || prop[0].title}".`, '#listing-' + req.params.id]
            );
        }

        res.json({ success: true, message: 'Listing updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update listing' });
    }
};

// --- PROPERTY REVIEW WORKFLOW ---

exports.getInternPropertiesToReview = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const listingsPath = path.join(__dirname, '../intern_listings.json');
        let properties = [];
        if (fs.existsSync(listingsPath)) {
            properties = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
        }
        res.json({ success: true, data: properties });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch properties for review' });
    }
};

exports.publishProperty = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const listingsPath = path.join(__dirname, '../intern_listings.json');
        if (fs.existsSync(listingsPath)) {
            let listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
            const prop = listings.find(p => p.id === req.params.id);
            if (prop) {
                const { category, subcategory } = req.body || {};
                
                // Keep the raw specs nested object updated if category provided
                if (category || subcategory) {
                    prop.specs = prop.specs || {};
                    if (Array.isArray(prop.specs)) {
                        prop.specs = prop.specs.filter(s => !s.startsWith('__CAT:') && !s.startsWith('__SUB:'));
                        if (category) prop.specs.push('__CAT:' + category);
                        if (subcategory) prop.specs.push('__SUB:' + subcategory);
                    } else {
                        prop.specs.category = category || prop.specs.category;
                        prop.specs.subcategory = subcategory || prop.specs.subcategory;
                    }
                }
                
                // Update intern_listings.json
                prop.approval_status = "Published";
                prop.status = "APPROVED";
                prop.updated_at = new Date().toISOString();
                fs.writeFileSync(listingsPath, JSON.stringify(listings, null, 2));
                
                // Add to properties.json for the main website
                const propsPath = path.join(__dirname, '../properties.json');
                let mainProps = [];
                if (fs.existsSync(propsPath)) {
                    mainProps = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
                }
                
                // Extract specs string for properties.json
                let flatSpecs = [];
                let pCat = category || 'Residential';
                let pSub = subcategory || 'Sale';
                
                if (prop.specs && !Array.isArray(prop.specs)) {
                    if (prop.specs.specifications) flatSpecs.push(...prop.specs.specifications);
                    if (prop.specs.features) flatSpecs.push(...prop.specs.features);
                    pCat = prop.specs.category || pCat;
                    pSub = prop.specs.subcategory || pSub;
                } else if (Array.isArray(prop.specs)) {
                    flatSpecs = prop.specs.filter(s => !s.startsWith('__'));
                } else if (prop.specifications) {
                    flatSpecs = prop.specifications;
                }
                
                const newMainProp = {
                    id: Date.now(),
                    title: prop.title || 'Untitled',
                    description: prop.description || '',
                    price: prop.price || '',
                    location: prop.location || '',
                    badge: prop.badge || 'New',
                    image: prop.image || (prop.photos && prop.photos.length ? prop.photos[0] : '') || (prop.media && prop.media.photos && prop.media.photos.length ? prop.media.photos[0] : ''),
                    media: prop.media || { photos: prop.photos || [], video: prop.video || '' },
                    specs: JSON.stringify(flatSpecs),
                    is_verified: true,
                    status: "Available",
                    category: pCat.toLowerCase(),
                    subcategory: pSub.toLowerCase(),
                    created_at: new Date().toISOString()
                };
                
                mainProps.push(newMainProp);
                fs.writeFileSync(propsPath, JSON.stringify(mainProps, null, 2));
                
                return res.json({ success: true, message: 'Property published successfully' });
            }
        }
        res.status(404).json({ success: false, message: 'Property not found' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to publish property' });
    }
};

exports.requestChanges = async (req, res) => {
    try {
        const { note } = req.body;
        if (!note) return res.status(400).json({ success: false, message: 'Change request note is required' });

        const fs = require('fs');
        const path = require('path');
        const listingsPath = path.join(__dirname, '../intern_listings.json');
        if (fs.existsSync(listingsPath)) {
            let listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
            const prop = listings.find(p => p.id === req.params.id);
            if (prop) {
                prop.approval_status = "Changes Requested";
                prop.status = "CHANGES REQUESTED";
                prop.admin_feedback = note;
                prop.updated_at = new Date().toISOString();
                fs.writeFileSync(listingsPath, JSON.stringify(listings, null, 2));
                return res.json({ success: true, message: 'Changes requested successfully' });
            }
        }
        res.status(404).json({ success: false, message: 'Property not found' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to request changes' });
    }
};

exports.rejectProperty = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ success: false, message: 'Reason is required' });
        
        const fs = require('fs');
        const path = require('path');
        const listingsPath = path.join(__dirname, '../intern_listings.json');
        if (fs.existsSync(listingsPath)) {
            let listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
            const prop = listings.find(p => p.id === req.params.id);
            if (prop) {
                prop.approval_status = "Rejected";
                prop.status = "REJECTED";
                prop.admin_feedback = reason;
                prop.updated_at = new Date().toISOString();
                fs.writeFileSync(listingsPath, JSON.stringify(listings, null, 2));
                return res.json({ success: true, message: 'Property rejected successfully' });
            }
        }
        res.status(404).json({ success: false, message: 'Property not found' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to reject property' });
    }
};

exports.reviewProperty = async (req, res) => {
    try {
        const { status, admin_feedback, publishToMain, category, subcategory } = req.body;
        
        if (status === 'APPROVED') {
            // Note: category and subcategory updates are now handled entirely inside publishProperty
            // so we can just pass them directly without any pool.query
            req.body.note = admin_feedback;
            return exports.publishProperty(req, res);
        } else if (status === 'CHANGES REQUESTED') {
            req.body.note = admin_feedback;
            return exports.requestChanges(req, res);
        } else if (status === 'REJECTED') {
            req.body.reason = admin_feedback;
            return exports.rejectProperty(req, res);
        }
        
        res.status(400).json({ success: false, message: 'Invalid status' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to review property' });
    }
};

// --- CHAT WORKFLOW ---

exports.getChat = async (req, res) => {
    try {
        const internId = req.params.id;
        const [conversations] = await pool.query('SELECT * FROM Conversations WHERE intern_id = ?', [internId]);
        if (!conversations.length) {
            return res.json({ success: true, messages: [] });
        }
        
        const conversationId = conversations[0].id;
        
        // Mark as read
        await pool.query('UPDATE Messages SET is_read = TRUE WHERE conversation_id = ? AND sender_type = "intern"', [conversationId]);
        
        const [messages] = await pool.query('SELECT * FROM Messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);
        res.json({ success: true, messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load chat' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const internId = req.params.id;
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

        let [conversations] = await pool.query('SELECT * FROM Conversations WHERE intern_id = ?', [internId]);
        let conversationId;
        
        if (!conversations.length) {
            const [result] = await pool.query('INSERT INTO Conversations (intern_id, admin_id) VALUES (?, ?)', [internId, req.user.id]);
            conversationId = result.insertId;
        } else {
            conversationId = conversations[0].id;
            await pool.query('UPDATE Conversations SET last_message_at = CURRENT_TIMESTAMP, admin_id = ? WHERE id = ?', [req.user.id, conversationId]);
        }
        
        await pool.query(
            'INSERT INTO Messages (conversation_id, sender_type, sender_id, message) VALUES (?, "admin", ?, ?)',
            [conversationId, req.user.id, message]
        );
        
        // Also add a notification for the intern
        await pool.query(
            'INSERT INTO Notifications (user_type, user_id, title, message, link) VALUES ("intern", ?, "New Message", ?, ?)',
            [internId, 'You have a new message from Admin.', '#']
        );
        
        res.json({ success: true, message: 'Message sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
};

exports.broadcastMessage = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message is required' });
        
        const [interns] = await pool.query('SELECT id FROM Interns WHERE status = "Active"');
        
        for (const intern of interns) {
            let [conversations] = await pool.query('SELECT * FROM Conversations WHERE intern_id = ?', [intern.id]);
            let conversationId;
            
            if (!conversations.length) {
                const [result] = await pool.query('INSERT INTO Conversations (intern_id, admin_id) VALUES (?, ?)', [intern.id, req.user.id]);
                conversationId = result.insertId;
            } else {
                conversationId = conversations[0].id;
                await pool.query('UPDATE Conversations SET last_message_at = CURRENT_TIMESTAMP, admin_id = ? WHERE id = ?', [req.user.id, conversationId]);
            }
            
            await pool.query(
                'INSERT INTO Messages (conversation_id, sender_type, sender_id, message) VALUES (?, "admin", ?, ?)',
                [conversationId, req.user.id, message]
            );
            
            await pool.query(
                'INSERT INTO Notifications (user_type, user_id, title, message, link) VALUES ("intern", ?, "Announcement", ?, ?)',
                [intern.id, 'New announcement from Admin.', '#']
            );
        }
        
        res.json({ success: true, message: 'Broadcast sent to all active interns' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to broadcast message' });
    }
};
