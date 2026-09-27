const fs = require('fs');
const path = require('path');

const getMessagesFile = () => path.join(__dirname, '../messages.json');

const readMessages = () => {
    try {
        if (fs.existsSync(getMessagesFile())) {
            return JSON.parse(fs.readFileSync(getMessagesFile(), 'utf8').replace(/^\uFEFF/, ''));
        }
    } catch (err) {
        console.error('Error parsing messages.json in readMessages:', err);
    }
    return [];
};

const saveMessages = (msgs) => {
    fs.writeFileSync(getMessagesFile(), JSON.stringify(msgs, null, 2));
};

exports.getMessages = async (req, res) => {
    try {
        const internId = req.params.internId;
        const callerType = req.intern ? 'intern' : 'admin';
        const messages = readMessages();
        
        let changed = false;
        
        // Filter messages for this intern
        const internMessages = messages.filter(m => m.conversation_id === internId);
        
        // Mark as read based on who is fetching
        internMessages.forEach(m => {
            if (m.sender_type !== callerType && !m.is_read) {
                m.is_read = true;
                changed = true;
            }
        });
        
        if (changed) {
            saveMessages(messages);
        }
        
        res.json({ success: true, data: internMessages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const internId = req.params.internId;
        const { message, senderType } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        
        if (!['admin', 'intern'].includes(senderType)) {
            return res.status(400).json({ success: false, message: 'Invalid sender type' });
        }

        const messages = readMessages();
        const senderId = senderType === 'intern' ? internId : 0;
        
        const newMessage = {
            id: Date.now(),
            conversation_id: internId,
            sender_type: senderType,
            sender_id: senderId,
            message: message.trim(),
            is_read: false,
            created_at: new Date().toISOString()
        };
        
        messages.push(newMessage);
        saveMessages(messages);

        // Emit real-time event via Socket.IO
        if (req.io) {
            req.io.to(`intern_${internId}`).emit('receive_message', newMessage);
        }

        res.json({ success: true, data: newMessage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const internId = req.params.internId;
        const callerType = req.intern ? 'intern' : 'admin';
        const messages = readMessages();
        
        const unreadCount = messages.filter(m => String(m.conversation_id) === String(internId) && m.sender_type !== callerType && !m.is_read).length;
        
        res.json({ success: true, count: unreadCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
    }
};
