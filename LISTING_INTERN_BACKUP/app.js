let authToken = localStorage.getItem('internToken');
let currentUser = JSON.parse(localStorage.getItem('internUser') || 'null');
let myListings = [];

// Base API behavior for local execution
const API_BASE = 'http://localhost:5000/api';

async function fetchApi(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        cache: 'no-store'
    });
    
    if (response.status === 401 || response.status === 403) {
        if(endpoint !== '/interns/login') logout();
    }
    return response;
}

document.addEventListener('DOMContentLoaded', () => {
    feather.replace();
    initApp();

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('intern-id').value;
        const password = document.getElementById('intern-password').value;
        
        try {
            const res = await fetchApi('/interns/login', {
                method: 'POST',
                body: JSON.stringify({ intern_id: id, password })
            });
            const data = await res.json();
            
            if (data.success) {
                authToken = data.token;
                currentUser = data.user;
                localStorage.setItem('internToken', authToken);
                localStorage.setItem('internUser', JSON.stringify(currentUser));
                showAppView();
            } else {
                const errDiv = document.getElementById('login-error');
                errDiv.textContent = data.message || 'Login failed';
                errDiv.style.display = 'block';
            }
        } catch(err) {
            console.error(err);
        }
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            
            if (targetId === 'my-listings-content') {
                loadMyListings();
            }
        });
    });

    // Time greeting
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    document.getElementById('greeting').textContent = `${greeting}, ${currentUser ? currentUser.name : ''}`;
    
    if(currentUser) {
        document.getElementById('current-username').textContent = currentUser.name;
    }
});

function initApp() {
    updateDate();
    if (authToken && currentUser) {
        showAppView();
        loadMyListings();
    } else {
        document.getElementById('login-view').classList.add('active');
        document.getElementById('app-view').classList.remove('active');
    }
}

function showAppView() {
    document.getElementById('login-view').classList.remove('active');
    document.getElementById('app-view').classList.add('active');
    if(currentUser) {
        document.getElementById('current-username').textContent = currentUser.name;
    }
}

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date-indicator').textContent = new Date().toLocaleDateString('en-US', options);
}

function logout() {
    localStorage.removeItem('internToken');
    localStorage.removeItem('internUser');
    window.location.reload();
}

async function loadMyListings() {
    try {
        const res = await fetchApi('/intern-listings');
        const json = await res.json();
        if(json.success) {
            myListings = json.data;
            updateDashboardKPIs();
            
            const tbody = document.getElementById('my-listings-table-body');
            tbody.innerHTML = '';
            if(myListings.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">You have no listings yet. Create your first draft!</td></tr>';
                return;
            }
            
            myListings.forEach(l => {
                const tr = document.createElement('tr');
                let badgeClass = 'badge-primary';
                if(l.status === 'DRAFT') badgeClass = 'badge-secondary';
                if(l.status === 'APPROVED') badgeClass = 'badge-success';
                if(l.status === 'CHANGES REQUESTED') badgeClass = 'badge-warning';
                
                tr.innerHTML = `
                    <td>${l.id}</td>
                    <td>${l.title}</td>
                    <td>${l.location}</td>
                    <td><span class="badge ${badgeClass}">${l.status}</span></td>
                    <td>
                        <button class="btn-primary" onclick="editListing('${l.id}')">Edit</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch(err) {
        console.error(err);
    }
}

function updateDashboardKPIs() {
    const drafts = myListings.filter(l => l.status === 'DRAFT').length;
    const submitted = myListings.filter(l => l.status === 'SUBMITTED').length;
    const changes = myListings.filter(l => l.status === 'CHANGES REQUESTED').length;
    const approved = myListings.filter(l => l.status === 'APPROVED').length;
    
    document.getElementById('kpi-drafts').textContent = drafts;
    document.getElementById('kpi-pending').textContent = submitted;
    document.getElementById('kpi-changes').textContent = changes;
    document.getElementById('kpi-approved').textContent = approved;
}

function openCreateListingModal() {
    document.getElementById('listing-form').reset();
    document.getElementById('list-id').value = '';
    document.getElementById('admin-feedback-alert').style.display = 'none';
    
    document.getElementById('btn-save-draft').style.display = 'inline-block';
    document.getElementById('btn-submit-review').style.display = 'inline-block';
    document.getElementById('btn-submit-review').textContent = 'Submit for Review';
    
    document.getElementById('listing-modal').classList.add('active');
}

function closeListingModal() {
    document.getElementById('listing-modal').classList.remove('active');
}

function editListing(id) {
    const l = myListings.find(x => x.id === id);
    if(!l) return;
    
    document.getElementById('list-id').value = l.id;
    document.getElementById('list-title').value = l.title;
    document.getElementById('list-type').value = l.type;
    document.getElementById('list-purpose').value = l.purpose;
    document.getElementById('list-location').value = l.location;
    document.getElementById('list-price').value = l.price;
    document.getElementById('list-image').value = l.image || '';
    document.getElementById('list-specs').value = l.specs ? l.specs.join(', ') : '';
    document.getElementById('list-desc').value = l.description || '';
    
    if(l.admin_feedback) {
        document.getElementById('list-feedback-text').textContent = l.admin_feedback;
        document.getElementById('admin-feedback-alert').style.display = 'block';
    } else {
        document.getElementById('admin-feedback-alert').style.display = 'none';
    }
    
    if (l.status === 'SUBMITTED' || l.status === 'APPROVED') {
        document.getElementById('btn-save-draft').style.display = 'none';
        document.getElementById('btn-submit-review').style.display = 'none';
    } else {
        document.getElementById('btn-save-draft').style.display = 'inline-block';
        document.getElementById('btn-submit-review').style.display = 'inline-block';
        if(l.status === 'CHANGES REQUESTED') {
            document.getElementById('btn-submit-review').textContent = 'Resubmit for Review';
        }
    }
    
    document.getElementById('listing-modal').classList.add('active');
}

async function saveListing(status) {
    if(!document.getElementById('listing-form').reportValidity()) return;
    
    const specsRaw = document.getElementById('list-specs').value;
    const specs = specsRaw ? specsRaw.split(',').map(s => s.trim()).filter(s => s) : [];
    
    const payload = {
        title: document.getElementById('list-title').value,
        type: document.getElementById('list-type').value,
        purpose: document.getElementById('list-purpose').value,
        location: document.getElementById('list-location').value,
        price: document.getElementById('list-price').value,
        image: document.getElementById('list-image').value,
        specs: specs,
        description: document.getElementById('list-desc').value,
        status: status
    };
    
    const id = document.getElementById('list-id').value;
    if(id) payload.id = id;
    
    try {
        const res = await fetchApi('/intern-listings', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(data.success) {
            closeListingModal();
            loadMyListings();
            if(status === 'SUBMITTED') alert('Listing submitted to admin for review!');
            else alert('Draft saved successfully!');
        } else {
            alert(data.message);
        }
    } catch(err) {
        console.error(err);
    }
}
