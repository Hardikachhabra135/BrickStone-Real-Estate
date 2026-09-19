const pool = require('../config/db');

exports.getNotifications = async (req, res) => {
    try {
        let query = 'SELECT * FROM Notifications WHERE user_type = ? ';
        const params = [req.user.role === 'admin' ? 'admin' : 'intern'];
        
        if (req.user.role === 'intern') {
            query += 'AND user_id = ? ';
            params.push(req.user.id);
        }
        
        query += 'ORDER BY created_at DESC LIMIT 50';
        
        const [notifications] = await pool.query(query, params);
        res.json({ success: true, data: notifications });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        let query = 'UPDATE Notifications SET is_read = TRUE WHERE id = ? AND user_type = ? ';
        const params = [id, req.user.role === 'admin' ? 'admin' : 'intern'];
        
        if (req.user.role === 'intern') {
            query += 'AND user_id = ?';
            params.push(req.user.id);
        }
        
        await pool.query(query, params);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
};
