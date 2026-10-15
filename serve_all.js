const path = require('path');
const express = require('./BACKEND/node_modules/express');

const frontendPath = path.join(__dirname, 'FRONTEND');
const adminPath = path.join(__dirname, 'ADMIN_PANEL');
const internPath = path.join(__dirname, 'INTERN_PORTAL');

// 1. Frontend Server (Port 3000 & 8001)
const appFrontend = express();
appFrontend.use(express.static(frontendPath));
// Convenience routes on port 3000
appFrontend.use('/admin', express.static(adminPath));
appFrontend.use('/intern', express.static(internPath));

appFrontend.listen(3000, '0.0.0.0', () => {
    console.log('✓ Main Website running at: http://localhost:3000');
});

appFrontend.listen(8001, '0.0.0.0', () => {
    console.log('✓ Main Website (alt) running at: http://localhost:8001');
});

// 2. Admin Panel Server (Port 8002)
const appAdmin = express();
appAdmin.use(express.static(adminPath));
appAdmin.listen(8002, '0.0.0.0', () => {
    console.log('✓ Admin Panel running at: http://localhost:8002');
});

// 3. Intern Portal Server (Port 8003)
const appIntern = express();
appIntern.use(express.static(internPath));
appIntern.listen(8003, '0.0.0.0', () => {
    console.log('✓ Intern Portal running at: http://localhost:8003');
});
