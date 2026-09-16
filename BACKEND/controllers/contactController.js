const pool = require('../config/db');

// Save a new general contact submission
exports.createContact = async (req, res) => {
    try {
        // The frontend forms might send different fields (e.g., fullName vs name)
        const name = req.body.fullName || req.body.name || '';
        const email = req.body.email || '';
        const phone = req.body.phone || '';
        const message = req.body.message || '';
        
        // Extract extra details
        const { fullName, name: _name, email: _email, phone: _phone, message: _message, ...extra } = req.body;
        const extra_details = JSON.stringify(extra);

        const [result] = await pool.query(
            'INSERT INTO ContactSubmissions (name, email, phone, message, extra_details) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, message, extra_details]
        );

        res.status(201).json({ success: true, message: 'Contact submission received successfully', data: { id: result.insertId } });
    } catch (error) {
        console.error('Error creating contact submission:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Retrieve all contact submissions for the admin panel
exports.getAllContacts = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM ContactSubmissions ORDER BY created_at DESC');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching contact submissions:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update contact status
exports.updateContactStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) return res.status(400).json({ success: false, message: 'status is required' });

        const [result] = await pool.query('UPDATE ContactSubmissions SET status = ? WHERE id = ?', [status, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }

        res.status(200).json({ success: true, message: 'Contact status updated' });
    } catch (error) {
        console.error('Error updating contact status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
