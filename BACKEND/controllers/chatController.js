const pool = require('../config/db');

// Ensure a conversation exists for this intern, return conversation_id
async function getOrCreateConversation(internId) {
    const [existing] = await pool.query('SELECT id FROM Conversations WHERE intern_id = ? LIMIT 1', [internId]);
    if (existing.length > 0) return existing[0].id;
    
    const [result] = await pool.query('INSERT INTO Conversations (intern_id) VALUES (?)', [internId]);
    return result.insertId;
}

exports.getMessages = async (req, res) => {
    try {
        const internId = req.params.internId;
        const conversationId = await getOrCreateConversation(internId);

        const [messages] = await pool.query(
            'SELECT * FROM Messages WHERE conversation_id = ? ORDER BY created_at ASC',
            [conversationId]
        );

        // Mark messages as read based on who is requesting (if Admin, mark intern messages as read)
        // For simplicity, just mark all read.
        await pool.query('UPDATE Messages SET is_read = TRUE WHERE conversation_id = ?', [conversationId]);

        res.json({ success: true, data: messages, messages: messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const internId = req.params.internId;
        const { message, senderType } = req.body;
        
        // Validation
        if (!message || message.trim() === '') {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        
        if (!['admin', 'intern'].includes(senderType)) {
            return res.status(400).json({ success: false, message: 'Invalid sender type' });
        }

        const conversationId = await getOrCreateConversation(internId);
        
        // We will just store 0 for admin sender_id, or the intern id for intern sender_id
        const senderId = senderType === 'intern' ? internId : 0;

        const [result] = await pool.query(
            'INSERT INTO Messages (conversation_id, sender_type, sender_id, message) VALUES (?, ?, ?, ?)',
            [conversationId, senderType, senderId, message.trim()]
        );

        const [newMessage] = await pool.query('SELECT * FROM Messages WHERE id = ?', [result.insertId]);

        // Update conversation last_message_at
        await pool.query('UPDATE Conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);

        // Emit real-time event via Socket.IO
        if (req.io) {
            req.io.to(`intern_${internId}`).emit('receive_message', newMessage[0]);
        }

        res.json({ success: true, data: newMessage[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
};
