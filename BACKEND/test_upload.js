const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

async function testUpload() {
    const token = jwt.sign({ role: 'intern', id: 1, intern_id: 'INT12345' }, process.env.JWT_SECRET || 'brickstone_secret_key');
    
    const FormData = require('form-data');
    const form = new FormData();
    const filepath = path.join(__dirname, 'dummy.png');
    fs.writeFileSync(filepath, 'dummy content');
    form.append('files', fs.createReadStream(filepath));

    try {
        const fetch = (await import('node-fetch')).default;
        const res = await fetch('http://localhost:5000/api/intern/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...form.getHeaders()
            },
            body: form
        });
        
        console.log("Status:", res.status);
        if (res.status !== 200) {
            console.log("Response Text:", await res.text());
        } else {
            console.log("Response JSON:", await res.json());
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
testUpload();
