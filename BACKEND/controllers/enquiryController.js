const pool = require('../config/db');

// Save a new property enquiry
exports.createEnquiry = async (req, res) => {
    try {
        const { property_id, property_title, phone, email } = req.body;

        if (!property_id) {
            return res.status(400).json({ success: false, message: 'property_id is required' });
        }

        const [result] = await pool.query(
            'INSERT INTO PropertyEnquiries (property_id, property_title, phone, email) VALUES (?, ?, ?, ?)',
            [property_id, property_title || '', phone || '', email || '']
        );

        res.status(201).json({ success: true, message: 'Enquiry received successfully', data: { id: result.insertId } });
    } catch (error) {
        console.error('Error creating enquiry:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Retrieve all property enquiries for the admin panel
exports.getAllEnquiries = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM PropertyEnquiries ORDER BY created_at DESC');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching enquiries:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update enquiry status
exports.updateEnquiryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) return res.status(400).json({ success: false, message: 'status is required' });

        const [result] = await pool.query('UPDATE PropertyEnquiries SET status = ? WHERE id = ?', [status, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Enquiry not found' });
        }

        res.status(200).json({ success: true, message: 'Enquiry status updated' });
    } catch (error) {
        console.error('Error updating enquiry status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
