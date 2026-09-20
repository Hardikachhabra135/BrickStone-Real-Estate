const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const [interns] = await pool.query('SELECT * FROM Interns WHERE intern_id = ? OR email = ?', [username, username]);
        
        if (interns.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const intern = interns[0];
        if (intern.status !== 'Active') {
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
        const [interns] = await pool.query('SELECT id, name, intern_id, email, phone, territory, monthly_target, status FROM Interns WHERE id = ?', [req.intern.id]);
        if (!interns.length) return res.status(404).json({ success: false, message: 'Intern not found' });
        
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_properties,
                SUM(CASE WHEN approval_status = 'Under Review' THEN 1 ELSE 0 END) as pending_properties,
                SUM(CASE WHEN approval_status = 'Approved' THEN 1 ELSE 0 END) as approved_properties,
                SUM(CASE WHEN approval_status = 'Changes Requested' THEN 1 ELSE 0 END) as changes_requested,
                SUM(CASE WHEN approval_status = 'Rejected' THEN 1 ELSE 0 END) as rejected_properties
            FROM Properties WHERE intern_id = ?`, [req.intern.id]);

        res.json({ success: true, intern: interns[0], stats: stats[0] });
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
        const [properties] = await pool.query(
            `SELECT p.*, (SELECT note FROM PropertyReviewNotes WHERE property_id = p.id ORDER BY created_at DESC LIMIT 1) as latest_note 
             FROM Properties p 
             WHERE intern_id = ? 
             ORDER BY created_at DESC`,
            [req.intern.id]
        );
        res.json({ success: true, data: properties });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch properties' });
    }
};

exports.getPropertyById = async (req, res) => {
    try {
        const [properties] = await pool.query('SELECT * FROM Properties WHERE id = ? AND intern_id = ?', [req.params.id, req.intern.id]);
        if (!properties.length) return res.status(404).json({ success: false, message: 'Property not found' });
        
        // Fetch notes if any
        const [notes] = await pool.query('SELECT * FROM PropertyReviewNotes WHERE property_id = ? ORDER BY created_at DESC', [req.params.id]);
        
        res.json({ success: true, property: properties[0], notes });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch property' });
    }
};

exports.createProperty = async (req, res) => {
    try {
        const { title, description, price, location, badge, image, specs, media } = req.body;
        const [result] = await pool.query(
            'INSERT INTO Properties (title, description, price, location, badge, image, specs, media, intern_id, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "Draft")',
            [title, description, price, location, badge, image, JSON.stringify(specs || {}), JSON.stringify(media || { photos: [], video: '' }), req.intern.id]
        );
        res.status(201).json({ success: true, message: 'Property created as Draft', property_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create property' });
    }
};

exports.updateProperty = async (req, res) => {
    try {
        const { title, description, price, location, badge, image, specs, media } = req.body;
        // Verify ownership and status
        const [props] = await pool.query('SELECT approval_status FROM Properties WHERE id = ? AND intern_id = ?', [req.params.id, req.intern.id]);
        if (!props.length) return res.status(404).json({ success: false, message: 'Property not found' });
        
        if (['Under Review', 'Approved'].includes(props[0].approval_status)) {
            return res.status(403).json({ success: false, message: 'Cannot edit property in this status' });
        }

        await pool.query(
            'UPDATE Properties SET title=?, description=?, price=?, location=?, badge=?, image=?, specs=?, media=? WHERE id=? AND intern_id=?',
            [title, description, price, location, badge, image, JSON.stringify(specs || {}), JSON.stringify(media || { photos: [], video: '' }), req.params.id, req.intern.id]
        );
        res.json({ success: true, message: 'Property updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update property' });
    }
};

exports.submitProperty = async (req, res) => {
    try {
        const [props] = await pool.query('SELECT approval_status FROM Properties WHERE id = ? AND intern_id = ?', [req.params.id, req.intern.id]);
        if (!props.length) return res.status(404).json({ success: false, message: 'Property not found' });
        
        await pool.query('UPDATE Properties SET approval_status = "Under Review" WHERE id = ? AND intern_id = ?', [req.params.id, req.intern.id]);
        
        // Notify Admins
        await pool.query(
            'INSERT INTO Notifications (user_type, title, message, link) VALUES ("admin", "New Listing Submitted", ?, ?)',
            [`Intern ID ${req.intern.id} submitted property #${req.params.id} for review`, '/admin-panel/listing-interns.html']
        );
        
        res.json({ success: true, message: 'Property submitted for review' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to submit property' });
    }
};

exports.resubmitProperty = async (req, res) => {
    try {
        const [props] = await pool.query('SELECT approval_status FROM Properties WHERE id = ? AND intern_id = ?', [req.params.id, req.intern.id]);
        if (!props.length) return res.status(404).json({ success: false, message: 'Property not found' });
        
        if (props[0].approval_status !== 'Changes Requested') {
            return res.status(400).json({ success: false, message: 'Property is not in Changes Requested status' });
        }

        await pool.query('UPDATE Properties SET approval_status = "Under Review" WHERE id = ? AND intern_id = ?', [req.params.id, req.intern.id]);
        
        // Notify Admins
        await pool.query(
            'INSERT INTO Notifications (user_type, title, message, link) VALUES ("admin", "Listing Resubmitted", ?, ?)',
            [`Intern ID ${req.intern.id} resubmitted property #${req.params.id} after changes`, '/admin-panel/listing-interns.html']
        );
        
        res.json({ success: true, message: 'Property resubmitted for review' });
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
