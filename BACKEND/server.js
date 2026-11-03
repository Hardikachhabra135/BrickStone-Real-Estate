require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const explicitAllowedOrigins = [
    'https://brickstonerealestate.in',
    'https://www.brickstonerealestate.in',
    'https://brickstone-admin-panel.vercel.app',
    'https://brickstone-frontend.vercel.app',
    'https://brick-stone-frontend.vercel.app',
    'https://brickstone-intern-portal-opal.vercel.app',
    'https://brickstone-real-estate-m8w1.onrender.com',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:8000',
    'http://localhost:8001',
    'http://localhost:8002',
    'http://localhost:8003',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:8001',
    'http://127.0.0.1:8002',
    'http://127.0.0.1:8003',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
    'http://192.168.1.6:3000',
    'http://192.168.1.6:5000',
    'http://192.168.1.6:8001',
    'http://192.168.1.6:8002',
    'http://192.168.1.6:8003'
];

if (process.env.ALLOWED_ORIGINS) {
    const extra = process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
    explicitAllowedOrigins.push(...extra);
}
if (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*') {
    explicitAllowedOrigins.push(process.env.FRONTEND_URL.trim());
}

function isOriginAllowed(origin) {
    if (!origin) return true;
    const normalized = origin.trim().replace(/\/$/, '');
    if (explicitAllowedOrigins.includes(normalized)) return true;

    try {
        const parsed = new URL(normalized);
        const host = parsed.hostname.toLowerCase();
        if (host === 'brickstonerealestate.in' || host.endsWith('.brickstonerealestate.in')) {
            return true;
        }
        if (host.endsWith('.vercel.app') && (host.startsWith('brickstone') || host.startsWith('brick-stone'))) {
            return true;
        }
        if (/^(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(host)) {
            return true;
        }
    } catch (e) {
        return false;
    }
    return false;
}

const corsOptions = {
    origin: function(origin, callback) {
        if (!origin || isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    maxAge: 86400
};

const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Socket.IO Setup
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: function(origin, callback) {
            if (!origin || isOriginAllowed(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        credentials: true
    }
});

// Middleware to expose io to controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});
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
const uploadRoutes = require('./routes/uploadRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Mount Routes
app.use('/api/admin', adminRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/auth', authRoutes);
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

app.use('/api/admin', internAdminRoutes);
app.use('/api/intern', internPortalRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// The Admin Panel is now independently deployed on Vercel
// app.use('/admin', express.static(path.join(__dirname, '../ADMIN_PANEL')));

// Root endpoint test (similar to old python backend)
app.get('/', (req, res) => {
    res.json({ message: "Brickstone Node.js Backend is running perfectly!" });
});

// Health Check Endpoints
app.get('/health', async (req, res) => {
    let dbStatus = 'healthy';
    try {
        const pool = require('./config/db');
        await pool.query('SELECT 1');
    } catch (e) {
        dbStatus = 'degraded';
    }
    res.status(200).json({
        status: 'ok',
        database: dbStatus,
        service: 'brickstone-backend',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', async (req, res) => {
    let dbStatus = 'healthy';
    try {
        const pool = require('./config/db');
        await pool.query('SELECT 1');
    } catch (e) {
        dbStatus = 'degraded';
    }
    res.status(200).json({
        status: 'ok',
        database: dbStatus,
        service: 'brickstone-backend',
        timestamp: new Date().toISOString()
    });
});

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    const origin = req.headers.origin;
    if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err.message || err);
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' && !err.status ? 'Internal server error' : (err.message || 'Server error')
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', async () => {
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

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join intern-specific room
    socket.on('join_intern_room', (internId) => {
        const roomName = `intern_${internId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined room ${roomName}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
