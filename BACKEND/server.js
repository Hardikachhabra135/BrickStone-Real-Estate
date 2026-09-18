require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use((req, res, next) => { console.log('INCOMING:', req.method, req.url); next(); }); // To parse JSON bodies

// Import Routes
const adminRoutes = require('./routes/adminRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const contactRoutes = require('./routes/contactRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const siteRoutes = require('./routes/siteRoutes');
const authRoutes = require('./routes/auth');
const internRoutes = require('./routes/internRoutes');
const internListingRoutes = require('./routes/internListingRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Mount Routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/admin', adminRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/interns', internRoutes);
app.use('/api/intern-listings', internListingRoutes);
app.use('/api/upload', uploadRoutes);

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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});


