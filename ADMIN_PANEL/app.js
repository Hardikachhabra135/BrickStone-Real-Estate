const API_BASE = window.ENV.API_URL;
let authToken = localStorage.getItem('brickstone_admin_token') || null;
let currentUser = JSON.parse(localStorage.getItem('brickstone_admin_user')) || null;
let currentRange = '30days';

// DOM Elements
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const currentUserEl = document.getElementById('current-username');
const roleBadge = document.getElementById('user-role-badge');
const dateIndicator = document.getElementById('current-date');
const refreshBtn = document.getElementById('global-refresh');
const dateFilter = document.getElementById('dashboard-date-filter');

// Panels & Nav
const panels = document.querySelectorAll('.content-panel');
const navItems = document.querySelectorAll('.nav-item');

// Init Auth State
function initApp() {
    updateDate();
    setInterval(updateDate, 60000); // update every minute

    if (authToken && currentUser) {
        showAppView();
    } else {
        showLoginView();
    }
}

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateIndicator.textContent = new Date().toLocaleDateString('en-US', options);
}

function showLoginView() {
    loginView.classList.add('active');
    appView.classList.remove('active');
}

function showAppView() {
    loginView.classList.remove('active');
    appView.classList.add('active');
    currentUserEl.textContent = currentUser.username;
    roleBadge.textContent = currentUser.role.toUpperCase();
    
    // Load initial data
    loadAllData();
}

function loadAllData() {
    loadDashboardStats();
    loadCharts();
    loadProperties();
    loadEnquiries();
    loadContacts();
    loadAboutSection();
}

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.getAttribute('data-target');
        
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        panels.forEach(panel => panel.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
        
        // Refresh feather icons in case new ones were added
        if(window.feather) feather.replace();
    });
});

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        const contentArea = btn.closest('.content-panel');
        contentArea.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(targetId).classList.add('active');
    });
});

// Sidebar Toggle (Mobile)
const toggleBtn = document.getElementById('toggle-sidebar');
const sidebar = document.getElementById('sidebar');
if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

// Global Refresh
refreshBtn.addEventListener('click', () => {
    const icon = refreshBtn.querySelector('i');
    icon.style.animation = 'spin 1s linear infinite';
    loadAllData();
    setTimeout(() => { icon.style.animation = ''; }, 1000);
});

// Date Filter
dateFilter.addEventListener('change', (e) => {
    currentRange = e.target.value;
    loadDashboardStats();
    loadCharts();
});

// Add keyframes for spin dynamically
const style = document.createElement('style');
style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
document.head.appendChild(style);


// Helpers
async function fetchApi(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    
    // Use localhost for the new About Section endpoints because they aren't deployed to Render yet.
    // Use the live API for everything else so real data is displayed.
    const base = endpoint.startsWith('/site/about') ? 'http://localhost:5000/api' : API_BASE;
    
    const url = new URL(`${base}${endpoint}`);
    // add range to analytics endpoints
    if (endpoint.startsWith('/analytics/')) {
        url.searchParams.append('range', currentRange);
    }
    url.searchParams.append('_t', new Date().getTime());

    const response = await fetch(url.toString(), {
        ...options,
        headers,
        cache: 'no-store'
    });
    
    if ((response.status === 401 || response.status === 403) && !endpoint.includes('/auth/login')) {
        logout();
        throw new Error('Unauthorized');
    }
    return response.json();
}

// Auth
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const btn = loginForm.querySelector('.login-btn');
    btn.textContent = 'Authenticating...';
    
    try {
        const res = await fetchApi('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (res.success) {
            authToken = res.token;
            currentUser = res.user;
            localStorage.setItem('brickstone_admin_token', authToken);
            localStorage.setItem('brickstone_admin_user', JSON.stringify(currentUser));
            loginError.style.display = 'none';
            showAppView();
        } else {
            loginError.textContent = res.message;
            loginError.style.display = 'block';
        }
    } catch (err) {
        loginError.textContent = 'Failed to connect to server';
        loginError.style.display = 'block';
    } finally {
        btn.textContent = 'Secure Sign In';
    }
});

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('brickstone_admin_token');
    localStorage.removeItem('brickstone_admin_user');
    showLoginView();
}
logoutBtn.addEventListener('click', logout);


// Dashboard Stats
async function loadDashboardStats() {
    try {
        const res = await fetchApi('/analytics/overview');
        if (res.success) {
            animateValue('kpi-visits', res.data.visitors);
            animateValue('kpi-properties', res.data.totalProperties);
            animateValue('kpi-verified', res.data.verifiedProperties);
            animateValue('kpi-enquiries', res.data.enquiries);
            animateValue('kpi-contacts', res.data.contactForms);
        } else {
            throw new Error("New analytics not available");
        }
    } catch (e) {
        // Fallback to old route if analytics isn't setup
        try {
            const oldRes = await fetchApi('/admin/dashboard-stats');
            if (oldRes.success) {
                animateValue('kpi-visits', oldRes.data.total_clicks);
                animateValue('kpi-properties', oldRes.data.total_properties);
                animateValue('kpi-verified', oldRes.data.total_verified_properties);
                animateValue('kpi-enquiries', oldRes.data.total_property_enquiries);
                animateValue('kpi-contacts', oldRes.data.total_contact_submissions);
            }
        } catch(err) {}
    }
}

function animateValue(id, end, duration = 1000) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * end).toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}


// Chart Instances
let trafficChart, sourcesChart, devicesChart;

const chartColors = {
    obsidian: '#1A1A1A',
    stone: '#8E8B82',
    mutedBronze: '#B89C72',
    bg: '#F9F8F6'
};

async function loadCharts() {
    // Top Pages
    try {
        const pagesRes = await fetchApi('/analytics/pages');
        if (pagesRes.success && pagesRes.data.length > 0) {
            const tbody = document.querySelector('#top-pages-table tbody');
            tbody.innerHTML = pagesRes.data.map(p => `
                <tr>
                    <td><strong>${p.page}</strong></td>
                    <td>${p.views.toLocaleString()}</td>
                    <td>${p.unique_visitors.toLocaleString()}</td>
                </tr>
            `).join('');
        } else {
            document.querySelector('#top-pages-table tbody').innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-secondary)">No traffic data available yet.</td></tr>';
        }
    } catch(e) {}

    // Traffic Chart
    try {
        const trafficRes = await fetchApi('/analytics/traffic');
        if (trafficRes.success) {
            const chartBody = document.getElementById('trafficChart').parentElement;
            if (trafficRes.data.length === 0) {
                chartBody.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-secondary); text-align:center;">No traffic data recorded yet.<br>Website tracking is now active.</div>';
            } else {
                const labels = trafficRes.data.map(d => {
                    const date = new Date(d.date);
                    return `${date.getDate()} ${date.toLocaleString('en-US', {month:'short'})}`;
                });
                const views = trafficRes.data.map(d => d.views);
                
                if (trafficChart) trafficChart.destroy();
                const ctx = document.getElementById('trafficChart').getContext('2d');
                trafficChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Page Views',
                            data: views,
                            borderColor: chartColors.obsidian,
                            backgroundColor: 'rgba(26, 26, 26, 0.05)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: chartColors.obsidian,
                            pointRadius: 3
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
                            x: { grid: { display: false } }
                        }
                    }
                });
            }
        }
    } catch(e) {
        document.getElementById('trafficChart').parentElement.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-secondary); text-align:center;">Traffic data unavailable.</div>';
    }

    // Sources Chart
    try {
        const sourcesRes = await fetchApi('/analytics/sources');
        if (sourcesRes.success) {
            const chartBody = document.getElementById('sourcesChart')?.parentElement || document.querySelector('#sourcesChart');
            if (!chartBody) return;
            if (sourcesRes.data.length === 0) {
                chartBody.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-secondary); text-align:center; font-size:0.9rem;">No source data yet.<br>Waiting for traffic.</div>';
            } else {
                if (sourcesChart) sourcesChart.destroy();
                const ctx = document.getElementById('sourcesChart').getContext('2d');
                sourcesChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: sourcesRes.data.map(d => d.source),
                        datasets: [{
                            data: sourcesRes.data.map(d => d.count),
                            backgroundColor: [chartColors.obsidian, chartColors.mutedBronze, chartColors.stone, '#D1D5DB', '#E5E7EB'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: {
                            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                        }
                    }
                });
            }
        }
    } catch(e) {
        const chartBody = document.getElementById('sourcesChart')?.parentElement;
        if(chartBody) chartBody.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-secondary); text-align:center;">Data unavailable.</div>';
    }

    // Devices Chart
    try {
        const devicesRes = await fetchApi('/analytics/devices');
        if (devicesRes.success) {
            const chartBody = document.getElementById('devicesChart')?.parentElement;
            if (!chartBody) return;
            if (devicesRes.data.length === 0) {
                chartBody.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-secondary); text-align:center; font-size:0.9rem;">No device data yet.</div>';
            } else {
                if (devicesChart) devicesChart.destroy();
                const ctx = document.getElementById('devicesChart').getContext('2d');
                devicesChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: devicesRes.data.map(d => d.device_type.toUpperCase()),
                        datasets: [{
                            data: devicesRes.data.map(d => d.count),
                            backgroundColor: chartColors.mutedBronze,
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, display: false },
                            x: { grid: { display: false } }
                        }
                    }
                });
            }
        }
    } catch(e) {
        const chartBody = document.getElementById('devicesChart')?.parentElement;
        if(chartBody) chartBody.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-secondary); text-align:center;">Data unavailable.</div>';
    }
}


// Properties
async function loadProperties() {
    try {
        const res = await fetchApi('/properties');
        if (res.success) {
            const tbody = document.getElementById('properties-tbody');
            tbody.innerHTML = res.data.map(p => `
                <tr>
                    <td><strong>${p.title}</strong></td>
                    <td>${p.location}</td>
                    <td>${p.price}</td>
                    <td><span class="status-badge ${p.status.toLowerCase()}">${p.status}</span></td>
                    <td>${p.is_verified ? '<i data-feather="check-circle" style="color:#10B981; width:16px;"></i> Verified' : '<span style="color:var(--text-secondary)">Pending</span>'}</td>
                    <td class="text-right">
                        <button class="btn-ghost" onclick="editProperty(${p.id})"><i data-feather="edit-2"></i></button>
                        ${currentUser?.role === 'admin' ? `<button class="btn-ghost" style="color:#EF4444" onclick="deleteProperty(${p.id})"><i data-feather="trash-2"></i></button>` : ''}
                    </td>
                </tr>
            `).join('');
            if(window.feather) feather.replace();
        }
    } catch (e) { console.error(e); }
}

async function editProperty(id) {
    try {
        const res = await fetchApi(`/properties/${id}`);
        if (res.success) {
            const p = res.data;
            document.getElementById('prop-id').value = p.id;
            document.getElementById('prop-title').value = p.title;
            document.getElementById('prop-price').value = p.price;
            document.getElementById('prop-location').value = p.location;
            document.getElementById('prop-status').value = p.status;
            document.getElementById('prop-verified').checked = !!p.is_verified;
            document.getElementById('prop-image').value = p.image || '';
            document.getElementById('prop-specs').value = p.specs ? p.specs.join(', ') : '';
            document.getElementById('prop-description').value = p.description || '';
            document.getElementById('prop-modal-title').textContent = 'Edit Property';
            
            document.getElementById('property-modal').classList.add('active');
        }
    } catch (e) { console.error(e); }
}

document.getElementById('add-property-btn').addEventListener('click', () => {
    document.getElementById('property-form').reset();
    document.getElementById('prop-id').value = '';
    document.getElementById('prop-modal-title').textContent = 'Add New Property';
    document.getElementById('property-modal').classList.add('active');
});

document.getElementById('property-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prop-id').value;
    
    const data = {
        title: document.getElementById('prop-title').value,
        price: document.getElementById('prop-price').value,
        location: document.getElementById('prop-location').value,
        status: document.getElementById('prop-status').value,
        is_verified: document.getElementById('prop-verified').checked,
        image: document.getElementById('prop-image').value || 'images/default.jpg',
        specs: document.getElementById('prop-specs').value.split(',').map(s => s.trim()).filter(s => s),
        description: document.getElementById('prop-description').value || 'Updated via Admin',
        badge: document.getElementById('prop-status').value === 'Available' ? 'For Sale' : document.getElementById('prop-status').value
    };

    try {
        let res;
        if (id) {
            res = await fetchApi(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            res = await fetchApi('/properties', { method: 'POST', body: JSON.stringify(data) });
        }
        
        if (res.success) {
            closeModal('property-modal');
            loadProperties();
            loadDashboardStats();
        } else {
            alert(res.message);
        }
    } catch (e) { console.error(e); }
});

async function deleteProperty(id) {
    if(!confirm('Are you sure you want to permanently delete this property?')) return;
    try {
        await fetchApi(`/properties/${id}`, { method: 'DELETE' });
        loadProperties();
        loadDashboardStats();
    } catch (e) { console.error(e); }
}


// Leads
async function loadEnquiries() {
    try {
        const res = await fetchApi('/enquiries');
        if (res.success) {
            document.getElementById('enquiries-tbody').innerHTML = res.data.map(l => `
                <tr>
                    <td>${new Date(l.created_at).toLocaleDateString()}</td>
                    <td><strong>${l.property_title || 'General'}</strong></td>
                    <td>
                        <div style="font-size:0.85rem">${l.phone}</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary)">${l.email}</div>
                    </td>
                    <td><span class="status-badge ${l.status.toLowerCase()}">${l.status}</span></td>
                    <td class="text-right">
                        <select onchange="updateLeadStatus('enquiries', ${l.id}, this.value)" class="premium-select" style="padding:0.25rem; font-size:0.8rem; width:auto; display:inline-block;">
                            <option value="New" ${l.status === 'New' ? 'selected' : ''}>New</option>
                            <option value="Contacted" ${l.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                            <option value="Resolved" ${l.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        </select>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

let contactsCache = [];
async function loadContacts() {
    try {
        const res = await fetchApi('/contact');
        if (res.success) {
            contactsCache = res.data;
            document.getElementById('contacts-tbody').innerHTML = res.data.map(c => {
                const isLong = c.message.length > 40;
                const displayMsg = isLong ? c.message.substring(0, 40) + '...' : c.message;
                
                return `
                <tr>
                    <td>${new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                        <strong>${c.name}</strong>
                        <div style="font-size:0.8rem; color:var(--text-secondary)">${c.email}</div>
                    </td>
                    <td>
                        <span style="font-size:0.85rem">${displayMsg}</span>
                        ${isLong ? `<button class="btn-ghost" style="padding:0.2rem 0.5rem; font-size:0.75rem; margin-left:0.5rem" onclick="viewFullMessage(${c.id})">Read</button>` : ''}
                    </td>
                    <td><span class="status-badge ${c.status.toLowerCase()}">${c.status}</span></td>
                    <td class="text-right">
                        <select onchange="updateLeadStatus('contact', ${c.id}, this.value)" class="premium-select" style="padding:0.25rem; font-size:0.8rem; width:auto; display:inline-block;">
                            <option value="New" ${c.status === 'New' ? 'selected' : ''}>New</option>
                            <option value="Contacted" ${c.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                            <option value="Resolved" ${c.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                        </select>
                    </td>
                </tr>
                `;
            }).join('');
        }
    } catch (e) { console.error(e); }
}

window.viewFullMessage = function(id) {
    const contact = contactsCache.find(c => c.id === id);
    if (contact) {
        document.getElementById('full-message-content').textContent = contact.message;
        document.getElementById('message-modal').classList.add('active');
    }
};

async function updateLeadStatus(type, id, status) {
    try {
        await fetchApi(`/${type}/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
        if(type === 'enquiries') loadEnquiries();
        if(type === 'contact') loadContacts();
    } catch (e) { console.error(e); }
}

window.closeModal = function(id) {
    document.getElementById(id).classList.remove('active');
};

// ==========================================
// ABOUT SECTION CMS LOGIC
// ==========================================

let currentAboutData = {};

async function loadAboutSection() {
    try {
        const statusEl = document.getElementById('about-status-text');
        if (statusEl) statusEl.textContent = 'Loading...';
        
        const res = await fetchApi('/site/about');
        if (res.success && res.data) {
            currentAboutData = res.data;
            
            // Populate Form
            if (document.getElementById('about-heading-input')) {
                document.getElementById('about-heading-input').value = res.data.heading || '';
                document.getElementById('about-subheading-input').value = res.data.subheading || '';
                document.getElementById('about-description-input').value = res.data.description || '';
                document.getElementById('about-closing-input').value = res.data.closing_line || '';
                document.getElementById('about-image-input').value = res.data.image_url || '';
                
                // Update Preview
                updateAboutPreview();
                
                if (statusEl) statusEl.textContent = `CURRENTLY LIVE (${res.data.updated_at ? new Date(res.data.updated_at).toLocaleString() : 'Just now'})`;
            }
        }
    } catch (e) {
        console.error('Failed to load about section', e);
        if (document.getElementById('about-status-text')) {
            document.getElementById('about-status-text').textContent = 'Error loading content';
        }
    }
}

function updateAboutPreview() {
    if(!document.getElementById('about-preview-heading')) return;
    document.getElementById('about-preview-heading').textContent = document.getElementById('about-heading-input').value || 'About Brickstone';
    document.getElementById('about-preview-subheading').textContent = document.getElementById('about-subheading-input').value || '';
    document.getElementById('about-preview-description').textContent = document.getElementById('about-description-input').value || '';
    document.getElementById('about-preview-closing').textContent = document.getElementById('about-closing-input').value || '';
    
    let src = document.getElementById('about-image-input').value || '';
    if (src.startsWith('images/')) {
        src = `http://localhost:8000/${src}`;
    }
    document.getElementById('about-preview-image').src = src;
}

// Bind live preview listeners (call once after DOM load)
setTimeout(() => {
    const aboutInputs = ['about-heading-input', 'about-subheading-input', 'about-description-input', 'about-closing-input', 'about-image-input'];
    aboutInputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', () => {
                updateAboutPreview();
                isAboutDirty = true;
            });
        }
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (isAboutDirty && !item.classList.contains('active')) {
                if (!confirm('You have unsaved changes in the About Section. Discard changes?')) {
                    e.preventDefault();
                    e.stopPropagation();
                } else {
                    isAboutDirty = false;
                    loadAboutSection(); // Reset form
                }
            }
        }, { capture: true });
    });
}, 1000);

let isAboutDirty = false;

async function publishAboutSection() {
    const btn = document.getElementById('publish-about-btn');
    btn.disabled = true;
    btn.textContent = 'SAVING...';
    
    const payload = {
        heading: document.getElementById('about-heading-input').value,
        subheading: document.getElementById('about-subheading-input').value,
        description: document.getElementById('about-description-input').value,
        closing_line: document.getElementById('about-closing-input').value,
        image_url: document.getElementById('about-image-input').value
    };
    
    try {
        const res = await fetchApi('/site/about', {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        
        if (res.success) {
            alert('About section published successfully.');
            isAboutDirty = false;
            loadAboutSection(); // refresh
        } else {
            alert('Unable to update About section. Please try again.');
        }
    } catch (e) {
        console.error('Publish error', e);
        alert('Unable to update About section. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'SAVE & PUBLISH';
    }
}

// Start app
initApp();
window.restoreDefaultAboutSection = async function() {
    if(!confirm('Are you sure you want to restore the default About section content?')) return;
    
    const defaultContent = {
        heading: 'About Brickstone',
        subheading: 'More than a property. A place to belong.',
        description: 'Brickstone connects you with carefully selected spaces defined by character, comfort, and convenience. From finding a new home to discovering your next opportunity, we make every search feel simpler and more considered.',
        closing_line: 'Find your space. Make it yours.',
        image_url: 'images/about.jpg'
    };
    
    document.getElementById('about-heading-input').value = defaultContent.heading;
    document.getElementById('about-subheading-input').value = defaultContent.subheading;
    document.getElementById('about-description-input').value = defaultContent.description;
    document.getElementById('about-closing-input').value = defaultContent.closing_line;
    document.getElementById('about-image-input').value = defaultContent.image_url;
    
    if(typeof updateAboutPreview === 'function') updateAboutPreview();
    
    // Trigger publish immediately
    publishAboutSection();
};
