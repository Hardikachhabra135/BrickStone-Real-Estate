const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/authMiddleware');

const internsFile = path.join(__dirname, '../interns.json');

// Helper to read/write JSON
const readInterns = () => JSON.parse(fs.readFileSync(internsFile, 'utf8'));
const writeInterns = (data) => fs.writeFileSync(internsFile, JSON.stringify(data, null, 2));

// Admin: Get all interns
router.get('/', auth.verifyToken, (req, res) => {
    // Should be admin authenticated
    const interns = readInterns();
    // exclude passwords
    const safeInterns = interns.map(i => {
        const { password_hash, ...rest } = i;
        return rest;
    });
    res.json({ success: true, data: safeInterns });
});

// Admin: Create intern
router.post('/', auth.verifyToken, async (req, res) => {
    const { name, intern_id, password, email, phone, territory, role_tier, monthly_target, team_lead, permissions } = req.body;
    const interns = readInterns();
    
    if (interns.find(i => i.intern_id === intern_id)) {
        return res.status(400).json({ success: false, message: 'Intern ID already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newIntern = {
        id: Date.now().toString(),
        intern_id,
        name,
        email: email || '',
        phone: phone || '',
        territory: territory || '',
        role_tier: role_tier || 'Field Listing Intern',
        monthly_target: monthly_target || 0,
        team_lead: team_lead || '',
        permissions: permissions || [],
        password_hash: hash,
        status: 'ACTIVE', // ACTIVE, SUSPENDED
        created_at: new Date().toISOString(),
        last_login: null
    };

    interns.push(newIntern);
    writeInterns(interns);

    res.json({ success: true, message: 'Intern created successfully', data: { intern_id: newIntern.intern_id } });
});

// Admin: Update intern status/password
router.patch('/:id', auth.verifyToken, async (req, res) => {
    const { status, password } = req.body;
    const interns = readInterns();
    const index = interns.findIndex(i => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Intern not found' });

    if (status) interns[index].status = status;
    if (password) {
        const salt = await bcrypt.genSalt(10);
        interns[index].password_hash = await bcrypt.hash(password, salt);
    }

    writeInterns(interns);
    res.json({ success: true, message: 'Intern updated' });
});

// Admin: Delete intern
router.delete('/:id', auth.verifyToken, (req, res) => {
    let interns = readInterns();
    const index = interns.findIndex(i => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Intern not found' });

    interns.splice(index, 1);
    writeInterns(interns);
    res.json({ success: true, message: 'Intern deleted' });
});

// Intern Login
router.post('/login', async (req, res) => {
    const { intern_id, password } = req.body;
    const interns = readInterns();
    const intern = interns.find(i => i.intern_id === intern_id);

    if (!intern) return res.status(400).json({ success: false, message: 'Invalid credentials' });
    if (intern.status !== 'ACTIVE') return res.status(403).json({ success: false, message: 'Account is ' + intern.status.toLowerCase() });

    const isMatch = await bcrypt.compare(password, intern.password_hash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    intern.last_login = new Date().toISOString();
    writeInterns(interns);

    const payload = {
        user: {
            id: intern.id,
            intern_id: intern.intern_id,
            role: 'intern',
            name: intern.name
        }
    };

    jwt.sign(payload, process.env.JWT_SECRET || 'supersecret123', { expiresIn: '8h' }, (err, token) => {
        if (err) throw err;
        res.json({ success: true, token, user: payload.user });
    });
});

module.exports = router;
