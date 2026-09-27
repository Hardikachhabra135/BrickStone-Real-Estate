const fs = require('fs');
const path = require('path');

const getMessagesFile = () => path.join(__dirname, '../messages.json');

const readMessages = () => {
    try {
        if (fs.existsSync(getMessagesFile())) {
            return JSON.parse(fs.readFileSync(getMessagesFile(), 'utf8'));
        }
    } catch (err) {
        console.error(err);
    }
    return [];
};

const saveMessages = (msgs) => {
    fs.writeFileSync(getMessagesFile(), JSON.stringify(msgs, null, 2));
};

exports.getMessages = async (req, res) => {
    try {
        const internId = req.params.internId;
        const messages = readMessages();
        
        // Filter messages for this intern
        const internMessages = messages.filter(m => m.conversation_id === internId);

        // Mark as read could be done here, but let's keep it simple
        
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
