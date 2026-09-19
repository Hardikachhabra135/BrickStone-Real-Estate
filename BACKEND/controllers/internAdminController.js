const pool = require('../config/db');
const bcrypt = require('bcryptjs');

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
             (SELECT COUNT(*) FROM Properties WHERE intern_id = i.id AND approval_status = 'Under Review') as pending_properties
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
        const [properties] = await pool.query('SELECT * FROM Properties WHERE intern_id = ? ORDER BY created_at DESC', [req.params.id]);
        res.json({ success: true, data: properties });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch properties' });
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
        
        await pool.query('UPDATE Properties SET approval_status = "Approved" WHERE id = ?', [req.params.id]);
        
        // Notify Intern
        if (prop[0].intern_id) {
            await pool.query(
                'INSERT INTO Notifications (user_type, user_id, title, message, link) VALUES ("intern", ?, "Listing Approved", ?, ?)',
                [prop[0].intern_id, `Your listing "${prop[0].title}" has been approved and published!`, '#']
            );
        }
        
        res.json({ success: true, message: 'Property published successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to publish property' });
    }
};

exports.requestChanges = async (req, res) => {
    try {
        const { note } = req.body;
        if (!note) return res.status(400).json({ success: false, message: 'Note is required' });
        
        // Get intern_id for this property
        const [prop] = await pool.query('SELECT intern_id FROM Properties WHERE id = ?', [req.params.id]);
        if (!prop.length) return res.status(404).json({ success: false, message: 'Property not found' });
        
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('UPDATE Properties SET approval_status = "Changes Requested" WHERE id = ?', [req.params.id]);
            await connection.query('INSERT INTO PropertyReviewNotes (property_id, intern_id, note) VALUES (?, ?, ?)', [req.params.id, prop[0].intern_id, note]);
            
            // Notify Intern
            await connection.query(
                'INSERT INTO Notifications (user_type, user_id, title, message, link) VALUES ("intern", ?, "Changes Requested", ?, ?)',
                [prop[0].intern_id, `Admin requested changes for listing #${req.params.id}.`, '#']
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
