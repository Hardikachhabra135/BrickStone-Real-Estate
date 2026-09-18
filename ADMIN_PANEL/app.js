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
    loadAdminTestimonials();
    loadInterns();
    loadInternListings();
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
    
    // Use localhost for the new About Section and Intern endpoints because they aren't deployed to Render yet.
    // Use the live API for everything else so real data is displayed.
    const isLocalEndpoint = endpoint.startsWith('/site/about') || endpoint.startsWith('/intern');
    const base = API_BASE;
    
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
            
            let catValue = '';
            let subValue = '';
            let displaySpecs = [];
            if (p.specs && Array.isArray(p.specs)) {
                p.specs.forEach(s => {
                    if (s.startsWith('__CAT:')) catValue = s.replace('__CAT:', '');
                    else if (s.startsWith('__SUB:')) subValue = s.replace('__SUB:', '');
                    else displaySpecs.push(s);
                });
            }

            // Set Category and Subcategory
            const catSelect = document.getElementById('prop-category');
            catSelect.value = catValue;
            window.updateSubcategories && window.updateSubcategories();
            document.getElementById('prop-subcategory').value = subValue;
            
            document.getElementById('prop-status').value = p.status;
            document.getElementById('prop-verified').checked = !!p.is_verified;
            document.getElementById('prop-image').value = p.image || '';
            document.getElementById('prop-specs').value = displaySpecs.join(', ');
            document.getElementById('prop-description').value = p.description || '';
            document.getElementById('prop-modal-title').textContent = 'Edit Property';
            
            document.getElementById('property-modal').classList.add('active');
        }
    } catch (e) { console.error(e); }
}

if(document.getElementById('add-property-btn')) document.getElementById('add-property-btn').addEventListener('click', () => {
    document.getElementById('property-form').reset();
    document.getElementById('prop-id').value = '';
    document.getElementById('prop-modal-title').textContent = 'Add New Property';
    document.getElementById('property-modal').classList.add('active');
});

if(document.getElementById('property-form')) document.getElementById('property-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prop-id').value;
    
    const rawSpecs = document.getElementById('prop-specs').value.split(',').map(s => s.trim()).filter(s => s);
    const cat = document.getElementById('prop-category').value;
    const sub = document.getElementById('prop-subcategory').value;
    if (cat) rawSpecs.push(`__CAT:${cat}`);
    if (sub) rawSpecs.push(`__SUB:${sub}`);

    const data = {
        title: document.getElementById('prop-title').value,
        price: document.getElementById('prop-price').value,
        location: document.getElementById('prop-location').value,
        status: document.getElementById('prop-status').value,
        is_verified: document.getElementById('prop-verified').checked,
        image: document.getElementById('prop-image').value || 'images/default.jpg',
        specs: rawSpecs,
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
        src = 'https://brick-stone-frontend.vercel.app/' + src;
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


// --- TESTIMONIALS MANAGER ---
const SEED_TESTIMONIALS = [
  { id: "bt-1", name: "Vikramaditya Singhania", role: "DLF Magnolias, Gurugram", serviceType: "Buying", rating: 5, quote: "Brickstone secured an off-market penthouse for our family within three weeks. Complete discretion, swift closing, and peerless market insight.", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", isActive: true },
  { id: "bt-2", name: "Dr. Ananya Sengupta", role: "Jor Bagh, New Delhi", serviceType: "Selling", rating: 5, quote: "Their white-glove advisory navigated title due diligence and high-net-worth negotiations seamlessly. The benchmark for luxury estate consultancy.", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", isActive: true },
  { id: "bt-3", name: "Rohan & Meera Khurana", role: "Lutyens' Bungalow Zone", serviceType: "Buying", rating: 5, quote: "Acquiring a heritage property in Central Delhi felt impossible until Brickstone stepped in. Truly refined client hospitality from start to finish.", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", isActive: true },
  { id: "bt-4", name: "Kavita Ramachandran", role: "Aerocity Commercial Suite", serviceType: "Renting", rating: 5, quote: "From initial lease terms to key handover, their attention to architectural detail and contract safety was remarkable.", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80", isActive: true },
  { id: "bt-5", name: "Sameer Vohra", role: "Civil Lines, New Delhi", serviceType: "Advisory", rating: 5, quote: "Exceptional insight on prime asset acquisition. They provided clear comparative analyses that saved us months of speculative viewings.", image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80", isActive: true }
];

function getTestimonials() {
  let data = localStorage.getItem('brickstone_testimonials');
  if (!data) {
    localStorage.setItem('brickstone_testimonials', JSON.stringify(SEED_TESTIMONIALS));
    return SEED_TESTIMONIALS;
  }
  return JSON.parse(data);
}

function saveTestimonials(data) {
  localStorage.setItem('brickstone_testimonials', JSON.stringify(data));
  loadAdminTestimonials();
  // dispatch storage event for frontend if they are in same origin
  window.dispatchEvent(new Event('storage'));
}

function loadAdminTestimonials() {
  const tests = getTestimonials();
  document.getElementById('test-count').textContent = `${tests.length}/10`;
  
  const addBtn = document.getElementById('add-testimonial-btn');
  if (tests.length >= 10) {
    addBtn.classList.add('btn-disabled');
    addBtn.style.opacity = '0.5';
  } else {
    addBtn.classList.remove('btn-disabled');
    addBtn.style.opacity = '1';
  }

  const tbody = document.getElementById('testimonials-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (tests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No testimonials found. Click "Add Testimonial" to create one.</td></tr>';
      return;
  }
  tests.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display:flex; align-items:center; gap:0.8rem;">
          ${t.image ? `<img src="${t.image}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">` : ''}
          <div>
            <strong>${t.name}</strong><br>
            <small style="color:var(--clr-text-light)">${t.role}</small>
          </div>
        </div>
      </td>
      <td><span class="status-badge" style="background:#F7F4EE; color:#D4AF37;">${t.serviceType}</span></td>
      <td>${t.rating}/5</td>
      <td>
        ${t.isActive ? '<span class="status-badge status-active">Published</span>' : '<span class="status-badge status-inactive">Draft</span>'}
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" title="Toggle Status" onclick="toggleTestimonial('${t.id}')">
            <i data-feather="${t.isActive ? 'eye-off' : 'eye'}"></i>
          </button>
          <button class="action-btn edit-btn" title="Edit" onclick="editTestimonial('${t.id}')">
            <i data-feather="edit-2"></i>
          </button>
          <button class="action-btn delete-btn" title="Delete" onclick="deleteTestimonial('${t.id}')">
            <i data-feather="trash-2"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if(window.feather) feather.replace();
}

function openTestimonialModal() {
  if (getTestimonials().length >= 10) {
    alert("Maximum limit reached (10/10). Delete or modify an existing review to add another.");
    return;
  }
  document.getElementById('testimonial-form').reset();
  document.getElementById('test-id').value = '';
  document.getElementById('test-char-count').textContent = '0';
  document.getElementById('test-image-base64').value = '';
  document.getElementById('test-image-preview').style.display = 'none';
  document.getElementById('test-image-preview').src = '';
  document.getElementById('test-image-file').value = '';
  document.getElementById('test-active').checked = true;
  document.getElementById('testimonial-modal').classList.add('active');
}

function editTestimonial(id) {
  const tests = getTestimonials();
  const t = tests.find(x => x.id === id);
  if (!t) return;
  
  document.getElementById('test-id').value = t.id;
  document.getElementById('test-name').value = t.name;
  document.getElementById('test-role').value = t.role;
  document.getElementById('test-service').value = t.serviceType;
  document.getElementById('test-rating').value = t.rating;
  document.getElementById('test-quote').value = t.quote;
  document.getElementById('test-image-base64').value = t.image || '';
  if (t.image) {
    document.getElementById('test-image-preview').src = t.image;
    document.getElementById('test-image-preview').style.display = 'block';
  } else {
    document.getElementById('test-image-preview').style.display = 'none';
  }
  document.getElementById('test-active').checked = t.isActive;
  document.getElementById('test-char-count').textContent = t.quote.length;
  
  document.getElementById('testimonial-modal').classList.add('active');
}

function toggleTestimonial(id) {
  const tests = getTestimonials();
  const t = tests.find(x => x.id === id);
  if (t) {
    t.isActive = !t.isActive;
    saveTestimonials(tests);
  }
}

function deleteTestimonial(id) {
  if (confirm('Are you sure you want to delete this testimonial?')) {
    let tests = getTestimonials();
    tests = tests.filter(x => x.id !== id);
    saveTestimonials(tests);
  }
}


// Quote character counter
const qInput = document.getElementById('test-quote');
if (qInput) {
    qInput.addEventListener('input', () => {
        document.getElementById('test-char-count').textContent = qInput.value.length;
    });
}

function handleTestimonialSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('test-id').value;
    const newT = {
        id: id || 'bt-' + Date.now(),
        name: document.getElementById('test-name').value,
        role: document.getElementById('test-role').value,
        serviceType: document.getElementById('test-service').value,
        rating: parseInt(document.getElementById('test-rating').value) || 5,
        quote: document.getElementById('test-quote').value,
        image: document.getElementById('test-image-base64').value,
        isActive: document.getElementById('test-active').checked
    };
    
    let tests = getTestimonials();
    if (id) {
        const idx = tests.findIndex(x => x.id === id);
        if (idx !== -1) tests[idx] = newT;
    } else {
        if (tests.length >= 10) {
            alert("Maximum limit reached (10/10). Delete or modify an existing review to add another.");
            return;
        }
        tests.unshift(newT);
    }
    saveTestimonials(tests);
    closeModal('testimonial-modal');
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 150;
                const MAX_HEIGHT = 150;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('test-image-base64').value = base64;
                const preview = document.getElementById('test-image-preview');
                preview.src = base64;
                preview.style.display = 'block';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

window.updateSubcategories = function() {
    const cat = document.getElementById('pub-category').value;
    const sub = document.getElementById('pub-subcategory');
    sub.innerHTML = '';
    
    let options = [];
    if(cat === 'flat') {
        options = ['1 BHK', '2 BHK', '3 BHK', '3 BHK+'];
    } else if (cat === 'pg') {
        options = ['Single Seater', 'Double Seater', 'Triple Seater', 'Co-Living'];
    } else {
        options = ['Select Category First...'];
    }
    
    options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = o;
        sub.appendChild(opt);
    });
};
// --- INTERN MANAGEMENT LOGIC ---

let currentReviewListingId = null;

function openInternModal() {
    (document.getElementById('create-intern-form') ? document.getElementById('create-intern-modal') : document.getElementById('intern-modal')).classList.add('active');
    (document.getElementById('create-intern-form') || document.getElementById('intern-form')).reset();
    document.getElementById('intern-success-card').style.display = 'none';
}

function closeInternModal() {
    (document.getElementById('create-intern-form') ? document.getElementById('create-intern-modal') : document.getElementById('intern-modal')).classList.remove('active');
}

function generateInternCredentials() {
    const randomId = 'BRK-LI-' + Math.floor(1000 + Math.random() * 9000);
    const randomPass = Math.random().toString(36).slice(-8);
    document.getElementById('intern-id').value = randomId;
    document.getElementById('intern-password').value = randomPass;
}

window.handleCreateIntern = async function(e) {
    e.preventDefault();
    
    // Generate an intern_id if not present in form
    const intern_id = 'BRK-LI-' + Math.floor(1000 + Math.random() * 9000);
    
    const data = {
        name: document.getElementById('int-name') ? document.getElementById('int-name').value : '',
        intern_id: intern_id,
        password: document.getElementById('int-password') ? document.getElementById('int-password').value : '',
        email: document.getElementById('int-email') ? document.getElementById('int-email').value : '',
        phone: '', // Not in form
        territory: document.getElementById('int-territory') ? document.getElementById('int-territory').value : '',
        role_tier: 'INTERN', // Default
        monthly_target: document.getElementById('int-target') ? parseInt(document.getElementById('int-target').value, 10) : 0,
        team_lead: '', // Not in form
        permissions: [] // Not in form
    };

    try {
        const res = await fetchApi('/interns', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if(json.success) {
            document.getElementById('success-intern-id').textContent = data.intern_id;
            document.getElementById('success-intern-password').textContent = data.password;
            document.getElementById('intern-success-card').style.display = 'block';
            loadInterns();
        } else {
            alert(json.message);
        }
    }     catch(err) {
        console.error(err);
        document.getElementById('interns-table-body').innerHTML = '<tr><td colspan="5" style="color:red;">Exception: ' + err.message + '</td></tr>';
    }
}

async function loadInterns() {
    const tbody = document.getElementById('interns-table-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;"><div class="spinner" style="width:20px;height:20px;border:3px solid #ccc;border-top-color:#333;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;vertical-align:middle;margin-right:10px;"></div> Loading interns...</td></tr>';
    try {
        const json = await fetchApi('/interns');
        if (!json.success) throw new Error(json.message || "Failed to load interns");
        
        tbody.innerHTML = '';
        if (json.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--text-light);"><i data-feather="users" style="width:48px;height:48px;margin-bottom:1rem;opacity:0.5;"></i><br/>No listing interns registered yet.<br/>Click <b>Add Listing Intern</b> to generate an onboarding upload link.</td></tr>';
            if(window.feather) feather.replace();
            return;
        }
        
        json.data.forEach(i => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600; color:var(--text-dark);">${i.name}</div>
                    <div style="font-size:12px; color:var(--text-light); margin-top:4px;">${i.role_tier || 'Intern'}</div>
                    <div style="font-size:11px; font-family:monospace; background:var(--surface-light); padding:2px 6px; border-radius:4px; display:inline-block; margin-top:6px;">ID: ${i.intern_id}</div>
                </td>
                <td>
                    <div style="font-size:13px; font-weight:500;">${i.territory || 'Unassigned'}</div>
                    <div style="font-size:12px; color:var(--text-light); margin-top:4px;">Target: ${i.monthly_target || 0}/mo</div>
                </td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="text" value="https://brick-stone-frontend.vercel.app/LISTING_INTERN/index.html" readonly style="font-family:monospace; font-size:11px; padding:6px 8px; border:1px solid var(--border-color); border-radius:4px; width:220px; background:var(--surface-light); color:var(--text-muted);" />
                        <button class="btn-ghost" onclick="copyPortalLink('${i.intern_id}', this)" style="padding:6px 10px; font-size:12px; height:auto; display:flex; align-items:center; gap:4px; border:1px solid var(--border-color);"><i data-feather="copy" style="width:14px; height:14px;"></i> Copy</button>
                        <a href="https://brick-stone-frontend.vercel.app/LISTING_INTERN/index.html" target="_blank" class="btn-ghost" style="padding:6px; height:auto; display:flex; align-items:center; border:1px solid var(--border-color);" title="Preview Portal"><i data-feather="external-link" style="width:14px; height:14px;"></i></a>
                    </div>
                </td>
                <td><span class="badge ${i.status==='ACTIVE'?'badge-success':'badge-warning'}">${i.status}</span></td>
                <td>
                    <div class="dropdown">
                        <button class="btn-ghost"><i data-feather="more-vertical"></i></button>
                        <div class="dropdown-content">
                            <a href="#" onclick="openChangePasswordModal('${i.intern_id}')"><i data-feather="key"></i> Change Password</a>
                            ${i.status==='ACTIVE' ? `<a href="#" onclick="toggleInternStatus('${i.intern_id}', 'SUSPENDED')"><i data-feather="pause-circle"></i> Suspend Access</a>` : `<a href="#" onclick="toggleInternStatus('${i.intern_id}', 'ACTIVE')"><i data-feather="play-circle"></i> Activate Access</a>`}
                            <div class="dropdown-divider"></div>
                            <a href="#" onclick="requestDeleteIntern('${i.intern_id}')" style="color:#dc2626;"><i data-feather="trash-2"></i> Delete Intern</a>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        if(window.feather) feather.replace();
    } catch(err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:#dc2626;"><i data-feather="alert-circle" style="margin-bottom:1rem;width:32px;height:32px;"></i><br/>Failed to load intern data: ${err.message}<br/><br/><button class="btn-secondary" onclick="loadInterns()">Retry Loading</button></td></tr>`;
        if(window.feather) feather.replace();
    }
}
async function toggleInternStatus(id, newStatus) {
    if(confirm('Change intern status to ' + newStatus + '?')) {
        await fetchApi('/interns/' + id, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        loadInterns();
    }
}

async function loadInternListings() {
    const revBody = document.getElementById('intern-reviews-table-body');
    const appBody = document.getElementById('approved-listings-table-body');
    
    revBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;"><div class="spinner" style="width:20px;height:20px;border:3px solid #ccc;border-top-color:#333;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;vertical-align:middle;margin-right:10px;"></div> Loading reviews...</td></tr>';
    appBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;"><div class="spinner" style="width:20px;height:20px;border:3px solid #ccc;border-top-color:#333;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;vertical-align:middle;margin-right:10px;"></div> Loading approved listings...</td></tr>';
    
    try {
        const json = await fetchApi('/intern-listings');
        if(!json.success) throw new Error(json.message || "Failed to load listings");
        
        window.currentInternListings = json.data;
        
        // Populate Pending
        revBody.innerHTML = '';
        const reviews = json.data.filter(l => l.status === 'SUBMITTED' || l.status === 'CHANGES REQUESTED');
        if(reviews.length === 0) {
            revBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:3rem; color:var(--text-light);">No listings pending review.</td></tr>';
        } else {
            reviews.forEach(l => {
                const tr = document.createElement('tr');
                const dateStr = l.created_at ? new Date(l.created_at).toLocaleDateString('en-US', {day:'numeric', month:'short', year:'numeric'}) : '--';
                tr.innerHTML = `
                    <td>${l.id}</td>
                    <td>${dateStr}</td>
                    <td>${l.intern_name}</td>
                    <td>${l.title}</td>
                    <td><span class="badge badge-warning">${l.status}</span></td>
                    <td style="display:flex; gap:8px;">
                        <button class="btn-primary" onclick="openReviewModal('${l.id}')">Review</button>
                        <button class="btn-ghost" style="color:#dc2626; padding: 6px 10px;" onclick="executeDeleteListing('${l.id}')"><i data-feather="trash-2" style="width:16px;"></i></button>
                    </td>
                `;
                revBody.appendChild(tr);
            });
        }
        
        // Populate Approved
        appBody.innerHTML = '';
        const approved = json.data.filter(l => l.status === 'APPROVED');
        if(approved.length === 0) {
            appBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--text-light);">No approved listings yet.</td></tr>';
        } else {
            approved.forEach(l => {
                const tr = document.createElement('tr');
                const dateStr = l.updated_at ? new Date(l.updated_at).toLocaleDateString('en-US', {day:'numeric', month:'short', year:'numeric'}) : '--';
                const publishBadge = l.is_published ? `<span style="display:inline-flex;align-items:center;background:#dcfce7;color:#166534;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:600;margin-left:10px;"><i data-feather="check" style="width:12px; height:12px; margin-right:4px;"></i>Published</span>` : '';
                tr.innerHTML = `
                    <td>${l.id}</td>
                    <td>${dateStr}</td>
                    <td>${l.intern_name}</td>
                    <td>${l.title} ${publishBadge}</td>
                    <td>
                        <button class="btn-secondary" onclick="openReviewModal('${l.id}')">View Details</button>
                    </td>
                `;
                appBody.appendChild(tr);
            });
        }
        if(window.feather) feather.replace();
    } catch(err) {
        console.error(err);
        const errHtml = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:#dc2626;"><i data-feather="alert-circle" style="margin-bottom:1rem;width:32px;height:32px;"></i><br/>Failed to load listings: ${err.message}<br/><br/><button class="btn-secondary" onclick="loadInternListings()">Retry Loading</button></td></tr>`;
        revBody.innerHTML = errHtml;
        appBody.innerHTML = errHtml;
        if(window.feather) feather.replace();
    }
}


// Hook into nav clicks for interns-content
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        if (targetId === 'interns-content') {
            loadInterns();
            loadInternListings();
        }
    });
});

function copyPortalLink(internId, btnElement) {
    const link = 'https://brick-stone-frontend.vercel.app/LISTING_INTERN/index.html';
    navigator.clipboard.writeText(link).then(() => {
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = '<i data-feather="check" style="color:#16a34a; width:14px; height:14px;"></i> Copied!';
        btnElement.style.color = '#16a34a';
        btnElement.style.borderColor = '#16a34a';
        feather.replace();
        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
            btnElement.style.color = '';
            btnElement.style.borderColor = '';
            feather.replace();
        }, 2000);
    });
}

let internToDelete = null;

function openDeleteInternModal(id, name) {
    internToDelete = id;
    document.getElementById('delete-intern-name').textContent = name;
    document.getElementById('delete-intern-modal').classList.add('active');
}

function closeDeleteInternModal() {
    document.getElementById('delete-intern-modal').classList.remove('active');
    internToDelete = null;
}

if(document.getElementById('confirm-delete-btn')) document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (!internToDelete) return;
    try {
        await fetchApi('/interns/' + internToDelete, { method: 'DELETE' });
        closeDeleteInternModal();
        loadInterns();
    }     catch(err) {
        console.error(err);
        document.getElementById('interns-table-body').innerHTML = '<tr><td colspan="5" style="color:red;">Exception: ' + err.message + '</td></tr>';
    }
});

let internToReset = null;

function openChangePasswordModal(id) {
    internToReset = id;
    document.getElementById('change-password-form').reset();
    document.getElementById('change-password-modal').classList.add('active');
}

function closeChangePasswordModal() {
    document.getElementById('change-password-modal').classList.remove('active');
    internToReset = null;
}

if(document.getElementById('change-password-form')) document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('new-intern-password').value;
    try {
        const json = await fetchApi('/interns/' + internToReset, {
            method: 'PATCH',
            body: JSON.stringify({ password: newPass })
        });
        if(json.success) {
            closeChangePasswordModal();
            alert('Password reset successfully.');
        } else {
            alert(json.message);
        }
    }     catch(err) {
        console.error(err);
        document.getElementById('interns-table-body').innerHTML = '<tr><td colspan="5" style="color:red;">Exception: ' + err.message + '</td></tr>';
    }
});




let listingToDelete = null;
let deleteStep = 1;

window.requestDeleteListing = function(id) {
    listingToDelete = id;
    deleteStep = 1;
    document.getElementById('del-title').textContent = "Delete Listing?";
    document.getElementById('del-msg').textContent = "This action will permanently remove the listing '" + id + "'. Do you want to proceed?";
    const btn = document.getElementById('del-confirm-btn');
    btn.textContent = "Yes, Proceed";
    btn.style.background = "#dc2626";
    document.getElementById('delete-confirm-modal').classList.add('active');
}

window.handleDeleteStep2 = function() {
    if (deleteStep === 1) {
        deleteStep = 2;
        document.getElementById('del-title').textContent = "Final Confirmation";
        document.getElementById('del-msg').innerHTML = "You are about to <b style='color:#dc2626;'>PERMANENTLY</b> delete listing " + listingToDelete + ".<br>This CANNOT be undone. Are you absolutely sure?";
        const btn = document.getElementById('del-confirm-btn');
        btn.textContent = "PERMANENTLY DELETE";
        btn.style.background = "#991b1b";
    } else if (deleteStep === 2) {
        executeDeleteListing();
    }
}

async function executeDeleteListing() {
    try {
        const res = await fetchApi('/intern-listings/' + listingToDelete, { method: 'DELETE' });
        const data = await res.json();
        if(data.success) {
            closeModal('delete-confirm-modal');
            loadInternListings();
            alert('Listing deleted successfully.');
        } else {
            alert(data.message || 'Failed to delete listing.');
        }
    } catch (e) {
        console.error(e);
        alert('Error deleting listing.');
    }
}











window.openLightbox = function(type, src) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const vid = document.getElementById('lightbox-video');
    if(type === 'image') {
        img.src = src;
        img.style.display = 'block';
        vid.style.display = 'none';
        vid.pause();
    } else {
        vid.src = src;
        vid.style.display = 'block';
        img.style.display = 'none';
    }
    modal.classList.add('active');
};


function openReviewModal(id) {
    const listing = window.currentInternListings.find(l => l.id === id);
    if(!listing) return;
    window.currentReviewListingId = id;
    
    document.getElementById('rev-title').textContent = listing.title || 'Untitled';
    document.getElementById('rev-intern').textContent = listing.intern_name;
    document.getElementById('rev-type').textContent = listing.property_type || listing.type || 'N/A';
    document.getElementById('rev-purpose').textContent = listing.purpose || 'N/A';
    document.getElementById('rev-price').textContent = listing.price || 'N/A';
    document.getElementById('rev-location').textContent = listing.location || 'N/A';
    
    const specsGrid = document.getElementById('rev-specs-grid');
    if (listing.specifications && listing.specifications.length > 0) {
        specsGrid.innerHTML = listing.specifications.map(s => '<span style="background:#f1f5f9; padding:6px 12px; font-size:13px; border-radius:4px; border:1px solid #e2e8f0; color:#334155;">' + s + '</span>').join('');
    } else {
        specsGrid.innerHTML = '<span style="color:#94a3b8; font-size:13px;">No specifications provided</span>';
    }
    
    const featuresGrid = document.getElementById('rev-features-grid');
    if (listing.features && listing.features.length > 0) {
        featuresGrid.innerHTML = listing.features.map(f => '<span style="background:#f8fafc; padding:4px 10px; font-size:12px; border-radius:12px; border:1px solid #cbd5e1; color:#475569;"><i data-feather="check" style="width:10px; height:10px; margin-right:4px; color:#10b981;"></i>' + f + '</span>').join('');
    } else {
        featuresGrid.innerHTML = '<span style="color:#94a3b8; font-size:13px;">No features provided</span>';
    }
    
    document.getElementById('rev-desc').textContent = listing.description || 'No description provided.';
    document.getElementById('rev-feedback').value = listing.admin_feedback || '';
    
    const photosContainer = document.getElementById('rev-photos');
    const videoEl = document.getElementById('rev-video');
    const videoTitle = document.getElementById('rev-video-title');
    
    if (photosContainer && videoEl) {
        photosContainer.innerHTML = '';
        videoEl.style.display = 'none';
        videoTitle.style.display = 'none';
        
        let hasMedia = false;
        
        if(listing.photos && listing.photos.length > 0) {
            hasMedia = true;
            listing.photos.forEach(p => {
                if(!p) return;
                const img = document.createElement('img');
                img.src = p;
                img.style.width = '100%';
                img.style.height = '120px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                img.style.cursor = 'pointer';
                img.onclick = () => window.openLightbox('image', p);
                photosContainer.appendChild(img);
            });
        } else if (listing.primary_photo || listing.image) {
            hasMedia = true;
            const img = document.createElement('img');
            img.src = listing.primary_photo || listing.image;
            img.style.width = '100%';
            img.style.height = '120px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '8px';
            img.style.cursor = 'pointer';
            img.onclick = () => window.openLightbox('image', listing.primary_photo || listing.image);
            photosContainer.appendChild(img);
        }
        
        if (listing.video || listing.video_url) {
            hasMedia = true;
            videoEl.src = listing.video || listing.video_url;
            videoEl.style.display = 'block';
            videoTitle.style.display = 'block';
        }
        
        document.getElementById('rev-media-container').style.display = hasMedia ? 'block' : 'none';
    }
    
    document.getElementById('review-modal').classList.add('active');
    setTimeout(() => { if(window.feather) feather.replace(); }, 50);
}

function closeReviewModal() {
    document.getElementById('review-modal').classList.remove('active');
}

window.submitReview = async function(status) {
    const feedback = document.getElementById('rev-feedback').value;
    try {
        await fetchApi('/intern-listings/' + window.currentReviewListingId + '/review', {
            method: 'PATCH',
            body: JSON.stringify({ status, admin_feedback: feedback })
        });
        closeReviewModal();
        loadInternListings();
        
        if (status === 'APPROVED') {
            alert('Listing Approved! Note: To make it public, you can recreate it in the Properties tab manually or wait for the automatic integration feature.');
        }
    } catch(err) {
        console.error(err);
        alert('Exception while submitting review: ' + err.message);
    }
}

window.openPublishModal = function() {
    document.getElementById('publish-modal').classList.add('active');
};

window.updateSubcategories = function() {
    const cat = document.getElementById('pub-category').value;
    const sub = document.getElementById('pub-subcategory');
    sub.innerHTML = '';
    
    let options = [];
    if(cat === 'flat') {
        options = ['1 BHK', '2 BHK', '3 BHK', '3 BHK+'];
    } else if (cat === 'pg') {
        options = ['Single Seater', 'Double Seater', 'Triple Seater', 'Co-Living'];
    } else {
        options = ['Select Category First...'];
    }
    
    options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = o;
        sub.appendChild(opt);
    });
};

window.executeApproveAndPublish = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i data-feather="loader" class="spin"></i> Publishing...';
    if(window.feather) feather.replace();
    
    const cat = document.getElementById('pub-category').value;
    const sub = document.getElementById('pub-subcategory').value;
    const feedback = document.getElementById('rev-feedback').value;
    
    try {
        const res = await fetchApi('/intern-listings/' + window.currentReviewListingId + '/review', {
            method: 'PATCH',
            body: JSON.stringify({ 
                status: 'APPROVED', 
                admin_feedback: feedback,
                publishToMain: true,
                category: cat,
                subcategory: sub
            })
        });
        
        closeModal('publish-modal');
        closeReviewModal();
        loadInternListings();
        
        alert(res.message || 'Listing Approved and Published!');
    } catch(err) {
        console.error(err);
        alert('Exception while submitting review: ' + err.message);
    }
    
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Publish to Main Site';
};

window.restoreDefaultTestimonials = function() {
    if(!confirm('Are you sure you want to restore the default testimonials? This will overwrite your current testimonials.')) return;
    localStorage.setItem('brickstone_testimonials', JSON.stringify(SEED_TESTIMONIALS));
    loadAdminTestimonials();
    window.dispatchEvent(new Event('storage'));
};
