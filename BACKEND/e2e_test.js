const http = require('http');

async function runTest() {
    const BASE_URL = 'http://localhost:5000';
    let adminToken = '';
    let internToken = '';
    let internId = '';
    let propertyId = '';

    console.log("Starting E2E Test...");

    try {
        // 1. Admin Login (assume default admin exists from migration or we can mock it)
        // Wait, what's the default admin credentials? Let's check auth logic or we can just bypass auth for test by creating a token.
        // Actually, we can generate a valid admin token directly using jsonwebtoken since we have JWT_SECRET.
        const jwt = require('jsonwebtoken');
        require('dotenv').config();
        
        adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'brickstone_super_secret_key_2024', { expiresIn: '1h' });
        console.log("Admin token generated:", adminToken.substring(0, 20) + "...");

        // 2. Create Intern
        console.log("Creating intern...");
        const res1 = await fetch(`${BASE_URL}/api/admin/interns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                name: 'Test Intern',
                intern_id: 'INT-TEST-001',
                password: 'password123',
                email: 'intern@test.com',
                territory: 'Localhost',
                monthly_target: 10
            })
        });
        const d1 = await res1.json();
        if(!d1.success) {
            if(d1.message === 'Intern ID or Email already exists') {
                 console.log('Intern already exists, continuing...');
            } else {
                 throw new Error(JSON.stringify(d1));
            }
        }
        
        // 3. Intern Login
        console.log("Intern login...");
        const res2 = await fetch(`${BASE_URL}/api/intern/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'INT-TEST-001', password: 'password123' })
        });
        const d2 = await res2.json();
        if(!d2.success) throw new Error(JSON.stringify(d2));
        internToken = d2.token;
        console.log("Intern logged in!");

        // 4. Create Draft Property
        console.log("Intern creating property...");
        const res3 = await fetch(`${BASE_URL}/api/intern/properties`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${internToken}` },
            body: JSON.stringify({
                title: 'Test Villa',
                price: '₹5,00,00,000',
                location: 'Test Location',
                badge: 'Premium',
                description: 'A test villa',
                image: 'img.jpg',
                specs: { bedrooms: 5, bathrooms: 5, area: '4000 sqft' }
            })
        });
        const d3 = await res3.json();
        if(!d3.success) throw new Error(JSON.stringify(d3));
        propertyId = d3.property_id;
        console.log("Property created, ID:", propertyId);

        // 5. Intern Submits Property
        console.log("Intern submitting property...");
        const res4 = await fetch(`${BASE_URL}/api/intern/properties/${propertyId}/submit`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${internToken}` }
        });
        const d4 = await res4.json();
        if(!d4.success) throw new Error(JSON.stringify(d4));

        // 6. Admin Requests Changes
        console.log("Admin requesting changes...");
        const res5 = await fetch(`${BASE_URL}/api/admin/intern-properties/${propertyId}/request-changes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ note: 'Fix the price format' })
        });
        const d5 = await res5.json();
        if(!d5.success) throw new Error(JSON.stringify(d5));

        // 7. Intern resubmits (we just added this to app.js, now let's call API directly)
        console.log("Intern resubmitting...");
        const res6 = await fetch(`${BASE_URL}/api/intern/properties/${propertyId}/resubmit`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${internToken}` }
        });
        const d6 = await res6.json();
        if(!d6.success) throw new Error(JSON.stringify(d6));

        // 8. Admin Publishes
        console.log("Admin publishing property...");
        const res7 = await fetch(`${BASE_URL}/api/admin/intern-properties/${propertyId}/publish`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const d7 = await res7.json();
        if(!d7.success) throw new Error(JSON.stringify(d7));

        console.log("ALL TESTS PASSED SUCCESSFULLY!");
    } catch(err) {
        console.error("Test failed:", err.message || err);
    }
}

runTest();
