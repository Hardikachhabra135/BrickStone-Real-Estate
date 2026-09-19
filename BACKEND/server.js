require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // To parse JSON bodies

// Import Routes
const adminRoutes = require('./routes/adminRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const contactRoutes = require('./routes/contactRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const siteRoutes = require('./routes/siteRoutes');
const authRoutes = require('./routes/auth');
const internAdminRoutes = require('./routes/internAdminRoutes');
const internPortalRoutes = require('./routes/internPortalRoutes');

// Mount Routes
app.use('/api/admin', adminRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', internAdminRoutes);
app.use('/api/intern', internPortalRoutes);

app.get('/api/admin/force-migration', async (req, res) => {
    try {
        const pool = require('./config/db');
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, 'migration_interns.sql');
        let sqlUtf8 = fs.readFileSync(migrationPath, 'utf8');
        if (sqlUtf8.includes('\0')) sqlUtf8 = fs.readFileSync(migrationPath, 'utf16le');
        const statements = sqlUtf8.split(';').filter(s => s.trim().length > 0);
        let log = [];
        for (const stmt of statements) {
            try {
                await pool.query(stmt);
                log.push("Success: " + stmt.substring(0, 50));
            } catch (e) {
                log.push("Error: " + e.message);
            }
        }
        res.json({ success: true, log });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// The Admin Panel is now independently deployed on Vercel
// app.use('/admin', express.static(path.join(__dirname, '../ADMIN_PANEL')));

// Root endpoint test (similar to old python backend)
app.get('/', (req, res) => {
    res.json({ message: "Brickstone Node.js Backend is running perfectly!" });
});

// Health Check Endpoints
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is healthy' });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is healthy' });
});

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server is running on port ${PORT}`);
    
    // DB Connection Diagnostic
    try {
        const pool = require('./config/db');
        const connection = await pool.getConnection();
        console.log('--- DATABASE DIAGNOSTIC ---');
        console.log('Status: Connected successfully');
        console.log(`Host: ${process.env.DB_HOST ? process.env.DB_HOST.substring(0, 5) + '...' : 'localhost'}`);
        console.log(`Database: ${process.env.DB_NAME || 'real_estate_db'}`);
        console.log(`Port: ${process.env.DB_PORT || 3306}`);
        console.log(`SSL Enabled: ${process.env.DB_SSL === 'true'}`);
        console.log('---------------------------');
        connection.release();
    } catch (err) {
        console.error('--- DATABASE DIAGNOSTIC FAILED ---');
        console.error('Failed to connect to the database on startup.');
        console.error(`Error Code: ${err.code}`);
        console.error(`Error Message: ${err.message}`);
        console.error('----------------------------------');
    }
});
