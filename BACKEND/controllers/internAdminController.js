const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Portal URL helper — localhost vs production
const PORTAL_URL = process.env.INTERN_PORTAL_URL || 'http://localhost:8081/index.html';

exports.createIntern = async (req, res) => {
    try {
        const { name, intern_id, password, email, phone, territory, monthly_target } = req.body;
        const password_hash = await bcrypt.hash(password, 10);
        
        const [result] = await pool.query(
            `INSERT INTO Interns (name, intern_id, email, phone, password_hash, territory, monthly_target) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, intern_id, email, phone || '', password_hash, territory || '', monthly_target || 0]
        );
        
        res.status(201).json({ success: true, message: 'Intern created successfully', intern_id: result.insertId });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Intern ID or Email already exists' });
        }
        res.status(500).json({ success: false, message: 'Failed to create intern' });
    }
};

exports.getInterns = async (req, res) => {
    try {
        const [interns] = await pool.query(
            `SELECT i.id, i.name, i.intern_id, i.email, i.phone, i.territory, i.monthly_target, i.status, i.created_at,
             (SELECT COUNT(*) FROM Properties WHERE intern_id = i.id) as total_properties,
             (SELECT COUNT(*) FROM Properties WHERE intern_id = i.id AND approval_status = 'Approved') as approved_properties,
             (SELECT COUNT(*) FROM Properties WHERE intern_id = i.id AND approval_status = 'Under Review') as pending_properties,
             (SELECT COUNT(*) FROM Properties WHERE intern_id = i.id AND approval_status = 'Changes Requested') as changes_requested,
             (SELECT COUNT(*) FROM Properties WHERE intern_id = i.id AND approval_status = 'Published') as published_properties,
             (SELECT COUNT(*) FROM Properties WHERE intern_id = i.id AND approval_status != 'Draft') as submitted_properties
            FROM Interns i ORDER BY i.created_at DESC`
        );
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
        if (!['Active', 'Inactive'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
        await pool.query('UPDATE Interns SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

exports.deleteIntern = async (req, res) => {
    try {
        // Safe soft-delete: deactivate intern, preserve all listing/chat/review history
        const [intern] = await pool.query('SELECT id, name FROM Interns WHERE id = ?', [req.params.id]);
        if (!intern.length) return res.status(404).json({ success: false, message: 'Intern not found' });

        // Check for active/published listings that would be impacted
        const [published] = await pool.query(
            'SELECT COUNT(*) as cnt FROM Properties WHERE intern_id = ? AND approval_status IN ("Approved", "Published")',
            [req.params.id]
        );

        // Deactivate intern (preserves all data)
        await pool.query('UPDATE Interns SET status = "Inactive" WHERE id = ?', [req.params.id]);

        res.json({
            success: true,
            message: `Intern deactivated successfully. ${published[0].cnt} published listing(s) remain on the website.`,
            published_count: published[0].cnt
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
        const hash = await bcrypt.hash(new_password, 10);
        // req.params.id can be either the numeric id or the intern_id string (INT12345)
        const [result] = await pool.query(
            'UPDATE Interns SET password_hash = ? WHERE intern_id = ? OR id = ?',
            [hash, req.params.id, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Intern not found' });
        res.json({ success: true, message: 'Password reset successful' });
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
        // Fetch properties submitted by interns
        const [properties] = await pool.query(
            `SELECT p.*, i.name as intern_name, i.intern_id as intern_identifier 
             FROM Properties p 
             JOIN Interns i ON p.intern_id = i.id 
             WHERE p.approval_status != 'Draft'
             ORDER BY p.updated_at DESC`
        );
        res.json({ success: true, data: properties });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch properties for review' });
    }
};

exports.publishProperty = async (req, res) => {
    try {
        const [prop] = await pool.query('SELECT intern_id, title FROM Properties WHERE id = ?', [req.params.id]);
        if (!prop.length) return res.status(404).json({ success: false, message: 'Property not found' });

        const { category, subcategory } = req.body || {};

        // Update specs with category/subcategory if provided
        if (category || subcategory) {
            const [propData] = await pool.query('SELECT specs FROM Properties WHERE id = ?', [req.params.id]);
            let specs = {};
            try { specs = JSON.parse(propData[0].specs) || {}; } catch(e) {}
            specs.category = category || specs.category;
            specs.subcategory = subcategory || specs.subcategory;
            await pool.query('UPDATE Properties SET specs = ? WHERE id = ?', [JSON.stringify(specs), req.params.id]);
        }

        await pool.query('UPDATE Properties SET approval_status = "Published", updated_at = NOW() WHERE id = ?', [req.params.id]);

        // Notify Intern
        if (prop[0].intern_id) {
            await pool.query(
                'INSERT INTO Notifications (user_type, user_id, title, message, link) VALUES ("intern", ?, "Listing Approved & Published", ?, ?)',
                [
                    prop[0].intern_id,
                    `Your listing "${prop[0].title}" has been approved and published to the Brickstone main website!`,
                    '#listing-' + req.params.id
                ]
            );
        }

        res.json({ success: true, message: 'Property published successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to publish property' });
    }
};

exports.requestChanges = async (req, res) => {
    try {
        const { note } = req.body;
        if (!note) return res.status(400).json({ success: false, message: 'Change request note is required' });

        // Get intern_id and title for this property
        const [prop] = await pool.query('SELECT intern_id, title FROM Properties WHERE id = ?', [req.params.id]);
        if (!prop.length) return res.status(404).json({ success: false, message: 'Property not found' });

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            await connection.query(
                'UPDATE Properties SET approval_status = "Changes Requested", updated_at = NOW() WHERE id = ?',
                [req.params.id]
            );

            // admin_id from token if available
            const adminId = req.user ? req.user.id : null;
            await connection.query(
                'INSERT INTO PropertyReviewNotes (property_id, intern_id, note) VALUES (?, ?, ?)',
                [req.params.id, prop[0].intern_id, note]
            );

            // Notify Intern with listing title and a link referencing the listing
            await connection.query(
                'INSERT INTO Notifications (user_type, user_id, title, message, link) VALUES ("intern", ?, "Changes Requested", ?, ?)',
                [
                    prop[0].intern_id,
                    `Admin requested changes for your listing "${prop[0].title || '#' + req.params.id}": ${note}`,
                    '#listing-' + req.params.id
                ]
            );

            await connection.commit();
            res.json({ success: true, message: 'Changes requested successfully' });
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to request changes' });
    }
};

exports.rejectProperty = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ success: false, message: 'Reason is required' });
        
        const [prop] = await pool.query('SELECT intern_id FROM Properties WHERE id = ?', [req.params.id]);
        if (!prop.length) return res.status(404).json({ success: false, message: 'Property not found' });

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('UPDATE Properties SET approval_status = "Rejected" WHERE id = ?', [req.params.id]);
            await connection.query('INSERT INTO PropertyReviewNotes (property_id, intern_id, note) VALUES (?, ?, ?)', [req.params.id, prop[0].intern_id, `Rejected: ${reason}`]);
            
            // Notify Intern
            await connection.query(
                'INSERT INTO Notifications (user_type, user_id, title, message, link) VALUES ("intern", ?, "Listing Rejected", ?, ?)',
                [prop[0].intern_id, `Your listing #${req.params.id} has been rejected.`, '#']
            );
            
            await connection.commit();
            res.json({ success: true, message: 'Property rejected successfully' });
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to reject property' });
    }
};

exports.reviewProperty = async (req, res) => {
    try {
        const { status, admin_feedback, publishToMain, category, subcategory } = req.body;
        
        if (status === 'APPROVED') {
            // Update category and subcategory if provided (save into specs)
            if (category || subcategory) {
                const [prop] = await pool.query('SELECT specs FROM Properties WHERE id = ?', [req.params.id]);
                if (prop.length) {
                    let specs = {};
                    try { specs = JSON.parse(prop[0].specs) || {}; } catch(e) {}
                    if (Array.isArray(specs)) {
                        // Frontend expects array with __CAT: flat, __SUB: 2bhk
                        specs = specs.filter(s => !s.startsWith('__CAT:') && !s.startsWith('__SUB:'));
                        if (category) specs.push('__CAT:' + category);
                        if (subcategory) specs.push('__SUB:' + subcategory);
                    } else {
                        specs.category = category;
                        specs.subcategory = subcategory;
                    }
                    await pool.query('UPDATE Properties SET specs = ? WHERE id = ?', [JSON.stringify(specs), req.params.id]);
                }
            }
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
