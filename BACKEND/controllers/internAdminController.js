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
        res.json({ success: true, interns });
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
        await pool.query('UPDATE Interns SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
        res.json({ success: true, message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
};

exports.getInternProperties = async (req, res) => {
    try {
        const [properties] = await pool.query('SELECT * FROM Properties WHERE intern_id = ? ORDER BY created_at DESC', [req.params.id]);
        res.json({ success: true, properties });
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
        res.json({ success: true, properties });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch properties for review' });
    }
};

exports.publishProperty = async (req, res) => {
    try {
        await pool.query('UPDATE Properties SET approval_status = "Approved" WHERE id = ?', [req.params.id]);
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
            await connection.query('INSERT INTO PropertyReviewNotes (property_id, intern_id, note) VALUES (?, ?, ?)', [req.params.id, prop[0].intern_id, 'REJECTED: ' + reason]);
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
