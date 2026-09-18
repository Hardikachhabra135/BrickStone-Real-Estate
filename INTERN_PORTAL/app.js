const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api/intern' 
    : 'https://brickstone-real-estate.onrender.com/api/intern';

let token = localStorage.getItem('intern_token');

async function fetchApi(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error('Unauthorized');
    }
    return res.json();
}

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    try {
        const data = await fetchApi('/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) });
        if (data.success) {
            token = data.token;
            localStorage.setItem('intern_token', token);
            initApp();
        } else {
            alert(data.message);
        }
    } catch(err) { alert(err.message || 'Login failed'); }
});

function logout() {
    token = null;
    localStorage.removeItem('intern_token');
    showView('login-view');
}

// App Logic
async function initApp() {
    if (!token) return showView('login-view');
    try {
        const data = await fetchApi('/me');
        if (data.success) {
            document.getElementById('intern-name-display').textContent = `Hello, ${data.intern.name}`;
            document.getElementById('stat-total').textContent = data.stats.total_properties || 0;
            document.getElementById('stat-pending').textContent = data.stats.pending_properties || 0;
            document.getElementById('stat-approved').textContent = data.stats.approved_properties || 0;
            document.getElementById('stat-changes').textContent = data.stats.changes_requested || 0;
            showView('dashboard-view');
            loadProperties();
        }
    } catch(err) {
        logout();
    }
}

async function loadProperties() {
    try {
        const data = await fetchApi('/properties');
        const tbody = document.getElementById('properties-tbody');
        tbody.innerHTML = '';
        if (data.properties.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No properties found.</td></tr>';
            return;
        }
        data.properties.forEach(p => {
            const tr = document.createElement('tr');
            let actions = '';
            
            if (p.approval_status === 'Draft') {
                actions = `<button onclick="editProperty(${p.id})" class="btn-ghost">Edit</button> 
                           <button onclick="submitProperty(${p.id})" class="btn-primary">Submit for Review</button>`;
            } else if (p.approval_status === 'Changes Requested') {
                actions = `<button onclick="editProperty(${p.id})" class="btn-ghost" style="color:var(--primary);">Edit</button>
                           <button onclick="resubmitProperty(${p.id})" class="btn-primary">Resubmit</button>`;
            } else {
                actions = `<button onclick="viewProperty(${p.id})" class="btn-ghost">View</button>`;
            }

            tr.innerHTML = `
                <td>${p.title}</td>
                <td>${p.location}</td>
                <td>${p.price}</td>
                <td><span class="badge ${p.approval_status.toLowerCase().replace(' ', '-')}">${p.approval_status}</span></td>
                <td style="display:flex;gap:5px;">${actions}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) { console.error(err); }
}

// Modal
function openPropertyModal(id = null) {
    document.getElementById('property-form').reset();
    document.getElementById('prop-id').value = id || '';
    document.getElementById('modal-title').textContent = id ? 'Edit Property' : 'Add Property';
    document.getElementById('property-modal').classList.add('active');
}

function closePropertyModal() {
    document.getElementById('property-modal').classList.remove('active');
}

async function editProperty(id) {
    try {
        const data = await fetchApi(`/properties/${id}`);
        if(data.success) {
            const p = data.property;
            document.getElementById('prop-id').value = p.id;
            document.getElementById('prop-title').value = p.title;
            document.getElementById('prop-price').value = p.price;
            document.getElementById('prop-location').value = p.location;
            document.getElementById('prop-badge').value = p.badge;
            document.getElementById('prop-description').value = p.description;
            document.getElementById('prop-image').value = p.image;
            
            let specs = {};
            try { specs = typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs; } catch(e){}
            document.getElementById('spec-beds').value = specs.bedrooms || '';
            document.getElementById('spec-baths').value = specs.bathrooms || '';
            document.getElementById('spec-area').value = specs.area || '';
            
            if(data.notes && data.notes.length > 0) {
                alert("Admin Note: " + data.notes[0].note);
            }
            openPropertyModal(id);
        }
    } catch(e) { alert('Failed to load property'); }
}

async function viewProperty(id) {
    alert("Viewing properties is not fully implemented in this demo. Status changes restrict edits.");
}

document.getElementById('property-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prop-id').value;
    const payload = {
        title: document.getElementById('prop-title').value,
        price: document.getElementById('prop-price').value,
        location: document.getElementById('prop-location').value,
        badge: document.getElementById('prop-badge').value,
        description: document.getElementById('prop-description').value,
        image: document.getElementById('prop-image').value,
        specs: {
            bedrooms: document.getElementById('spec-beds').value,
            bathrooms: document.getElementById('spec-baths').value,
            area: document.getElementById('spec-area').value
        }
    };

    try {
        if (id) {
            await fetchApi(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            // If it was changes requested, user needs to click "Submit" explicitly or we can auto-submit.
            // Let's just save for now.
        } else {
            await fetchApi('/properties', { method: 'POST', body: JSON.stringify(payload) });
        }
        closePropertyModal();
        loadProperties();
    } catch(e) { alert('Failed to save'); }
});

async function submitProperty(id) {
    if(!confirm('Are you sure you want to submit this for review? You will not be able to edit it.')) return;
    try {
        await fetchApi(`/properties/${id}/submit`, { method: 'POST' });
        loadProperties();
        initApp(); // reload stats
    } catch(e) { alert('Failed to submit'); }
}

async function resubmitProperty(id) {
    if(!confirm('Are you sure you want to resubmit this for review?')) return;
    try {
        await fetchApi(`/properties/${id}/resubmit`, { method: 'POST' });
        loadProperties();
        initApp();
    } catch(e) { alert('Failed to resubmit'); }
}

if(token) initApp();
