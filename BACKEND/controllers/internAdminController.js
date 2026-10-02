const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Portal URL helper — localhost vs production
const PORTAL_URL = process.env.INTERN_PORTAL_URL || 'http://localhost:8081/index.html';

exports.createIntern = async (req, res) => {
    try {
        const { name, intern_id, password, email, phone, territory, monthly_target } = req.body;
        const password_hash = await bcrypt.hash(password, 10);

        // Test DB availability
        let dbAvailable = false;
        try { await pool.query('SELECT 1'); dbAvailable = true; } catch(e) {}

        if (!dbAvailable) {
            // JSON fallback
            const fs = require('fs');
            const path = require('path');
            const internsPath = path.join(__dirname, '../interns.json');
            let interns = [];
            if (fs.existsSync(internsPath)) {
                try { interns = JSON.parse(fs.readFileSync(internsPath, 'utf8').replace(/^\uFEFF/, '')); } catch(e) {}
            }
            if (interns.some(i => i.email === email || i.intern_id === intern_id)) {
                return res.status(400).json({ success: false, message: 'Intern ID or Email already exists' });
            }
            const newIntern = {
                id: Date.now().toString(),
                name, intern_id, email,
                phone: phone || '',
                password_hash,
                territory: territory || '',
                monthly_target: monthly_target || 0,
                status: 'ACTIVE',
                created_at: new Date().toISOString()
            };
            interns.push(newIntern);
            fs.writeFileSync(internsPath, JSON.stringify(interns, null, 2));
            return res.status(201).json({ success: true, message: 'Intern created successfully', intern_id: newIntern.id });
        }

        const [existing] = await pool.query('SELECT id FROM Interns WHERE intern_id = ? OR email = ?', [intern_id, email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Intern ID or Email already exists' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO Interns (name, intern_id, email, phone, password_hash, territory, monthly_target, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, intern_id, email, phone || '', password_hash, territory || '', monthly_target || 0, 'Active']
        );
        
        res.status(201).json({ success: true, message: 'Intern created successfully', intern_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create intern' });
    }
};

exports.getInterns = async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const internsPath = path.join(__dirname, '../interns.json');
    const messagesPath = path.join(__dirname, '../messages.json');
    const listingsPath = path.join(__dirname, '../intern_listings.json');

    // Helper to load JSON file safely
    const loadJson = (filePath) => {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
            }
        } catch(e) { console.error('loadJson error:', filePath, e.message); }
        return [];
    };

    // Helper to decorate interns with listing/message counts
    const decorateInterns = (interns, listings, messages, legacyInterns = []) => {
        return interns.map(intern => {
            const legacyIntern = legacyInterns.find(i => i.intern_id === intern.intern_id);
            const legacyId = legacyIntern ? legacyIntern.id : null;
            const unreadCount = messages.filter(m =>
                String(m.conversation_id) === String(intern.id) && m.sender_type === 'intern' && !m.is_read
            ).length;
            const listingCount = listings.filter(l =>
                String(l.intern_id) === String(intern.intern_id) ||
                String(l.intern_id) === String(intern.id) ||
                (legacyId && String(l.intern_id) === String(legacyId))
            ).length;
            return {
                ...intern,
                status: intern.status ? intern.status.toUpperCase() : 'ACTIVE',
                unread_count: unreadCount,
                listingCount
            };
        });
    };

    try {
        // --- Test DB connectivity first ---
        let dbAvailable = false;
        try {
            await pool.query('SELECT 1');
            dbAvailable = true;
        } catch(connErr) {
            console.warn('DB not available, falling back to interns.json:', connErr.message);
        }

        if (!dbAvailable) {
            // ---- JSON FALLBACK (local dev / DB offline) ----
            const interns = loadJson(internsPath);
            const messages = loadJson(messagesPath);
            const listings = loadJson(listingsPath);
            const decorated = decorateInterns(interns, listings, messages);
            return res.json({ success: true, data: decorated });
        }

        // ---- DB PATH (production) ----

        // Sync legacy JSON interns into DB (one-time migration, idempotent)
        const fileInterns = loadJson(internsPath);
        for (const fi of fileInterns) {
            try {
                const [exists] = await pool.query('SELECT id FROM Interns WHERE intern_id = ?', [fi.intern_id]);
                if (exists.length === 0) {
                    await pool.query(
                        'INSERT INTO Interns (name, intern_id, email, phone, password_hash, territory, monthly_target, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            fi.name,
                            fi.intern_id,
                            fi.email,
                            fi.phone || '',
                            fi.password_hash,
                            fi.territory || '',
                            fi.monthly_target || 0,
                            fi.status === 'ACTIVE' || fi.status === 'Active' ? 'Active' : 'Inactive',
                            fi.created_at ? new Date(fi.created_at) : new Date()
                        ]
                    );
                }
            } catch(syncErr) {
                console.error('Sync error for intern', fi.intern_id, syncErr.message);
            }
        }

        const [dbInterns] = await pool.query(
            'SELECT id, name, intern_id, email, phone, territory, monthly_target, status, created_at FROM Interns ORDER BY created_at DESC'
        );

        const messages = loadJson(messagesPath);
        const listings = loadJson(listingsPath);
        const legacyInterns = loadJson(internsPath);

        const formattedInterns = decorateInterns(dbInterns, listings, messages, legacyInterns);
        res.json({ success: true, data: formattedInterns });

    } catch (err) {
        console.error('getInterns error:', err);
        // Last-resort fallback: serve from JSON so the admin panel never shows a hard error
        try {
            const interns = loadJson(internsPath);
            const messages = loadJson(messagesPath);
            const listings = loadJson(listingsPath);
            return res.json({ success: true, data: decorateInterns(interns, listings, messages) });
        } catch(fallbackErr) {
            res.status(500).json({ success: false, message: 'Failed to fetch interns' });
        }
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
        const normalizedStatus = (status === 'ACTIVE' || status === 'Active') ? 'Active' : 'Inactive';

        let dbAvailable = false;
        try { await pool.query('SELECT 1'); dbAvailable = true; } catch(e) {}

        if (!dbAvailable) {
            const fs = require('fs'); const path = require('path');
            const internsPath = path.join(__dirname, '../interns.json');
            if (fs.existsSync(internsPath)) {
                let interns = JSON.parse(fs.readFileSync(internsPath, 'utf8').replace(/^\uFEFF/, ''));
                const intern = interns.find(i => i.intern_id === req.params.id || i.id === req.params.id);
                if (intern) { intern.status = normalizedStatus.toUpperCase(); fs.writeFileSync(internsPath, JSON.stringify(interns, null, 2)); }
            }
            return res.json({ success: true, message: 'Status updated' });
        }

        await pool.query('UPDATE Interns SET status = ? WHERE id = ?', [normalizedStatus, req.params.id]);
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

exports.deleteIntern = async (req, res) => {
    try {
        let dbAvailable = false;
        try { await pool.query('SELECT 1'); dbAvailable = true; } catch(e) {}

        if (!dbAvailable) {
            const fs = require('fs'); const path = require('path');
            const internsPath = path.join(__dirname, '../interns.json');
            if (fs.existsSync(internsPath)) {
                let interns = JSON.parse(fs.readFileSync(internsPath, 'utf8').replace(/^\uFEFF/, ''));
                const index = interns.findIndex(i => i.intern_id === req.params.id || i.id === req.params.id);
                if (index === -1) return res.status(404).json({ success: false, message: 'Intern not found' });
                interns.splice(index, 1);
                fs.writeFileSync(internsPath, JSON.stringify(interns, null, 2));
            }
            return res.json({ success: true, message: 'Intern deleted successfully.', published_count: 0 });
        }

        const [result] = await pool.query('DELETE FROM Interns WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Intern not found' });
        }
        res.json({ success: true, message: 'Intern deleted successfully.', published_count: 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to deactivate intern' });
    }
};

exports.resetInternPassword = async (req, res) => {
    try {
        const { new_password } = req.body;
        if (!new_password) return res.status(400).json({ success: false, message: 'New password required' });
        
        const password_hash = await bcrypt.hash(new_password, 10);

        let dbAvailable = false;
        try { await pool.query('SELECT 1'); dbAvailable = true; } catch(e) {}

        if (!dbAvailable) {
            const fs = require('fs'); const path = require('path');
            const internsPath = path.join(__dirname, '../interns.json');
            if (fs.existsSync(internsPath)) {
                let interns = JSON.parse(fs.readFileSync(internsPath, 'utf8').replace(/^\uFEFF/, ''));
                const intern = interns.find(i => i.intern_id === req.params.id || i.id === req.params.id);
                if (intern) { intern.password_hash = password_hash; fs.writeFileSync(internsPath, JSON.stringify(interns, null, 2)); return res.json({ success: true, message: 'Password reset successful' }); }
            }
            return res.status(404).json({ success: false, message: 'Intern not found' });
        }

        const [result] = await pool.query('UPDATE Interns SET password_hash = ? WHERE id = ?', [password_hash, req.params.id]);
        if (result.affectedRows > 0) return res.json({ success: true, message: 'Password reset successful' });
        return res.status(404).json({ success: false, message: 'Intern not found' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
};

exports.getInternProperties = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const listingsPath = path.join(__dirname, '../intern_listings.json');
        const internsPath = path.join(__dirname, '../interns.json');

        let dbAvailable = false;
        try { await pool.query('SELECT 1'); dbAvailable = true; } catch(e) {}

        let intern;
        if (!dbAvailable) {
            // JSON fallback: find intern by id or intern_id string
            if (fs.existsSync(internsPath)) {
                const allInterns = JSON.parse(fs.readFileSync(internsPath, 'utf8').replace(/^\uFEFF/, ''));
                intern = allInterns.find(i => String(i.id) === String(req.params.id) || String(i.intern_id) === String(req.params.id));
            }
            if (!intern) return res.status(404).json({ success: false, message: 'Intern not found' });
        } else {
            const [dbInterns] = await pool.query('SELECT * FROM Interns WHERE id = ?', [req.params.id]);
            if (!dbInterns.length) return res.status(404).json({ success: false, message: 'Intern not found' });
            intern = dbInterns[0];
        }

        let properties = [];
        if (fs.existsSync(listingsPath)) {
            let listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8').replace(/^\uFEFF/, ''));
            
            // For backwards compatibility mapping
            const internsPath = path.join(__dirname, '../interns.json');
            let legacyId = null;
            if (fs.existsSync(internsPath)) {
                try {
                    const legacyInterns = JSON.parse(fs.readFileSync(internsPath, 'utf8').replace(/^\uFEFF/, ''));
                    const legacyIntern = legacyInterns.find(i => i.intern_id === intern.intern_id);
                    if (legacyIntern) legacyId = legacyIntern.id;
                } catch(e) {}
            }
            
            properties = listings.filter(l => 
                String(l.intern_id) === String(intern.intern_id) || 
                String(l.intern_id) === String(intern.id) ||
                (legacyId && String(l.intern_id) === String(legacyId))
            );
        }

        // Add dummy latest_review_note for compatibility
        properties = properties.map(p => ({
            ...p,
            latest_review_note: p.admin_feedback || null
        }));

        // Sort descending by created_at
        properties.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Count stats
        const stats = {
            total: properties.length,
            pending: properties.filter(p => p.approval_status === 'Under Review').length,
            changes_requested: properties.filter(p => p.approval_status === 'Changes Requested').length,
            approved: properties.filter(p => p.approval_status === 'Approved').length,
            published: properties.filter(p => p.approval_status === 'Published').length,
            drafts: properties.filter(p => p.approval_status === 'Draft').length
        };

        res.json({ success: true, data: properties, intern: intern, stats });
    } catch (err) {
        console.error('Error in getInternProperties:', err);
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
            const rawListings = fs.readFileSync(listingsPath, 'utf8');
            properties = JSON.parse(rawListings.replace(/^\uFEFF/, ''));
        }
        
        let dbAvailable = false;
        try { await pool.query('SELECT 1'); dbAvailable = true; } catch(e) {}
        
        let dbInterns = [];
        if (dbAvailable) {
            const [rows] = await pool.query('SELECT id, intern_id, name FROM Interns');
            dbInterns = rows;
        }

        // Backwards compatibility for legacy IDs
        const internsPath = path.join(__dirname, '../interns.json');
        let legacyInterns = [];
        if (fs.existsSync(internsPath)) {
             try { legacyInterns = JSON.parse(fs.readFileSync(internsPath, 'utf8').replace(/^\uFEFF/, '')); } catch(e) {}
        }
        
        properties = properties.map(p => {
            let internName = '--';
            let internId = p.intern_id;

            if (dbAvailable) {
                let intern = dbInterns.find(i => String(i.id) === String(p.intern_id) || String(i.intern_id) === String(p.intern_id));
                if (!intern) {
                    const legacy = legacyInterns.find(i => String(i.id) === String(p.intern_id));
                    if (legacy) intern = dbInterns.find(i => String(i.intern_id) === String(legacy.intern_id));
                }
                if (intern) {
                    internName = intern.name;
                    internId = intern.intern_id;
                }
            } else {
                let intern = legacyInterns.find(i => String(i.id) === String(p.intern_id) || String(i.intern_id) === String(p.intern_id));
                if (intern) {
                    internName = intern.name;
                    internId = intern.intern_id;
                }
            }
            
            return { 
                ...p, 
                intern_name: internName,
                intern_id: internId 
            };
        });

        res.json({ success: true, data: properties });
    } catch (err) {
        console.error('Error in getInternPropertiesToReview:', err);
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
