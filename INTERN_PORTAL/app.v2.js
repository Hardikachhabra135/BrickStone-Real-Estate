const API_BASE = window.ENV ? window.ENV.API_URL : 'http://localhost:5000/api';
let authToken = localStorage.getItem('internToken');
let currentUser = null;
try {
    const stored = localStorage.getItem('internUser');
    currentUser = stored && stored !== 'undefined' ? JSON.parse(stored) : null;
} catch(e) {
    console.error('Invalid internUser in storage', e);
    localStorage.removeItem('internUser');
}
let myListings = [];
let currentStep = 1;
let uploadedMedia = { photos: [], video: null };
let editingListingId = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get('id');

    if (authToken && currentUser) {
        if (requestedId && currentUser.intern_id !== requestedId) {
            // Switching interns: clear auth and show login
            authToken = null;
            currentUser = null;
            localStorage.removeItem('internToken');
            localStorage.removeItem('internUser');
            const lv = document.getElementById('login-view');
            if (lv) {
                lv.style.display = 'flex';
                const idEl = document.getElementById('login-id');
                if (idEl) idEl.value = requestedId;
            }
            return;
        }

        const lv = document.getElementById('login-view');
        if (lv) lv.remove();
        showApp();
    } else {
        const lv = document.getElementById('login-view');
        if (lv) { 
            lv.style.display = 'flex'; 
            if (requestedId) {
                const idEl = document.getElementById('login-id');
                if (idEl) {
                    idEl.value = requestedId;
                }
            }
        }
    }
    
    // Auth Listener
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Login process started");
            let btn = null;
            let origText = "Sign In";
            try {
                const idEl = document.getElementById('login-id');
                const passEl = document.getElementById('login-pass');
                
                if (!idEl || !passEl) {
                    console.error("Missing input elements!");
                    return;
                }
                
                const id = idEl.value.trim();
                const password = passEl.value;
                
                if (!id || !password) {
                    alert('Please enter both Intern ID and Password');
                    return;
                }
                
                btn = e.target;
                origText = btn.textContent;
                btn.textContent = 'Signing in...';
                btn.disabled = true;
                
                console.log(`Sending API request to ${API_BASE}/intern/login`);
                const res = await fetch(`${API_BASE}/intern/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: id, password })
                });
                
                console.log("API response status:", res.status);
                const data = await res.json();
                console.log("API response data:", data);
                
                if (data.success) {
                    authToken = data.token;
                    currentUser = data.intern;
                    localStorage.setItem('internToken', authToken);
                    localStorage.setItem('internUser', JSON.stringify(currentUser));
                    const loginView = document.getElementById('login-view');
                    if (loginView) loginView.remove();
                    showApp();
                } else {
                    alert(data.message || 'Invalid credentials');
                }
            } catch(err) {
                console.error('Fatal Login Error:', err);
                alert('Connection error or internal script error. Check console.');
            } finally {
                if (btn) {
                    btn.textContent = origText;
                    btn.disabled = false;
                }
            }
        });
    }

    setupNavigation();
    setupFeatureChips();
    setupMediaUploaders();
    setupLivePreview();
});

// Auth
async function fetchApi(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    
    // Auto-remove content type if body is FormData (browser will set multipart boundary)
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

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

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('internToken');
    localStorage.removeItem('internUser');
    // Reload page to restore login overlay cleanly
    window.location.reload();
}

let socket = null;

function setupSocket() {
    if (!currentUser || !authToken) return;
    // Derive base URL from API_BASE
    const baseUrl = API_BASE.replace('/api', '');
    socket = io(baseUrl);
    
    socket.on('connect', () => {
        console.log('Connected to chat server');
        socket.emit('join_intern_room', currentUser.id);
    });

    socket.on('receive_message', (msg) => {
        // If chat is open, append message
        const container = document.getElementById('chat-messages');
        if (container && document.getElementById('chat-view').classList.contains('active')) {
            if (container.innerHTML.includes('Start a conversation')) {
                container.innerHTML = '';
            }
            appendMessageToUI(msg, container);
        } else {
            showToast('New message from Admin', 'message-circle');
        }
    });
}

function showApp() {
    document.getElementById('display-user-name').textContent = currentUser.name || currentUser.username;
    document.getElementById('greeting-name').textContent = (currentUser.name || currentUser.username).toUpperCase();
    loadDashboard();
    setupSocket();
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item[data-target]').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.workspace-view').forEach(v => v.classList.remove('active'));
            document.getElementById(item.getAttribute('data-target')).classList.add('active');
            
            if(item.getAttribute('data-target') === 'dashboard-view') loadDashboard();
            if(item.getAttribute('data-target') === 'my-listings-view') {
                const filter = item.getAttribute('data-filter') || 'ALL_SUBMITTED';
                document.getElementById('listing-filter').value = filter === 'Draft' ? 'ALL_SUBMITTED' : filter;
                loadListings(filter);
            }
            if(item.getAttribute('data-target') === 'new-listing-view') resetEditor();
            if(item.getAttribute('data-target') === 'chat-view') loadChat();
        });
    });
}

async function loadNotifications() {
    try {
        const res = await fetchApi('/intern/notifications');
        const data = await res.json();
        const container = document.getElementById('notifications-container');
        
        if (data.success && data.data && data.data.length > 0) {
            container.innerHTML = data.data.map(n => `
                <div class="activity-item" style="opacity: ${n.is_read ? '0.6' : '1'}">
                    <div class="activity-icon"><i data-feather="bell" style="color:var(--accent-color)"></i></div>
                    <div class="activity-details">
                        <div class="activity-text"><strong>${n.title}</strong>: ${n.message}</div>
                        <div class="activity-time">${new Date(n.created_at).toLocaleString()}</div>
                    </div>
                </div>
            `).join('');
            feather.replace();
        } else {
            container.innerHTML = '<div class="empty-state" style="padding:2rem;">No notifications</div>';
        }
    } catch (err) {
        console.error(err);
    }
}

// Dashboard & Listings
async function loadDashboard() {
    try {
        const res = await fetchApi('/intern/properties');
        const json = await res.json();
        if(json.success) {
            myListings = json.data;
            updateDashboardKPIs();
            renderRecentListings();
            loadNotifications();
        }
    } catch(err) {
        console.error(err);
    }
}

async function loadListings(filter = 'ALL_SUBMITTED') {
    await loadDashboard(); // refresh data
    
    const viewHeader = document.querySelector('#my-listings-view .page-title');
    const viewSubtitle = document.querySelector('#my-listings-view .page-subtitle');
    const filterSelect = document.getElementById('listing-filter');
    
    if (filter === 'Draft') {
        viewHeader.textContent = 'Drafts';
        viewSubtitle.textContent = 'Manage your saved property drafts.';
        filterSelect.style.display = 'none';
    } else {
        viewHeader.textContent = 'My Listings';
        viewSubtitle.textContent = 'Manage your inventory and track submission status.';
        filterSelect.style.display = 'block';
    }

    renderListingsGrid(filter);
}

document.getElementById('listing-filter').addEventListener('change', (e) => {
    renderListingsGrid(e.target.value);
});

function updateDashboardKPIs() {
    const drafts = myListings.filter(l => l.approval_status === 'Draft').length;
    const pending = myListings.filter(l => l.approval_status === 'Under Review').length;
    const changes = myListings.filter(l => l.approval_status === 'Changes Requested').length;
    const approved = myListings.filter(l => l.approval_status === 'Approved').length;
    
    document.getElementById('kpi-drafts').textContent = drafts;
    document.getElementById('kpi-pending').textContent = pending;
    document.getElementById('kpi-changes').textContent = changes;
    document.getElementById('kpi-approved').textContent = approved;
}

function getPrimaryImage(l) {
    if (l.image) return l.image;
    if (l.media) {
        try {
            const mediaObj = typeof l.media === 'string' ? JSON.parse(l.media) : l.media;
            if (mediaObj && mediaObj.photos && mediaObj.photos.length > 0) return mediaObj.photos[0];
        } catch(e) {}
    }
    return 'https://via.placeholder.com/400x200/111111/52525b';
}

function renderRecentListings() {
    const container = document.getElementById('recent-listings-container');
    const recent = myListings.slice(0, 3);
    
    if (recent.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:2rem;">No recent listings</div>';
        return;
    }
    
    container.innerHTML = recent.map(l => {
        const imgUrl = getPrimaryImage(l);
        return `
        <div class="activity-item" style="cursor:pointer;" onclick="editListing('${l.id}')">
            <img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/60x60/111111/52525b'" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">
            <div>
                <div style="font-weight:500; font-size:14px; color:var(--text-primary);">${l.title || 'Untitled'}</div>
                <div style="font-size:12px; color:var(--text-secondary);">${l.location || 'No location'} â€¢ ${l.price || '--'}</div>
                <span style="font-size:10px; margin-top:4px; display:inline-block; color:var(--status-${l.approval_status.toLowerCase().split(' ')[0]})">${l.approval_status === 'Under Review' ? 'Pending Review' : l.approval_status}</span>
            </div>
        </div>
    `}).join('');
}

function renderListingsGrid(filter) {
    const grid = document.getElementById('listings-grid');
    
    let filtered = myListings;
    if (filter === 'ALL_SUBMITTED') {
        filtered = myListings.filter(l => l.approval_status !== 'Draft');
    } else if (filter === 'Approved') {
        filtered = myListings.filter(l => l.approval_status === 'Approved' || l.approval_status === 'Published');
    } else if (filter !== 'ALL') {
        filtered = myListings.filter(l => l.approval_status === filter);
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i data-feather="box"></i>
                <h3>No listings found</h3>
                <p>Try changing the filter or create a new listing.</p>
            </div>
        `;
        feather.replace();
        return;
    }
    
    grid.innerHTML = filtered.map(l => {
        const statusClass = 'status-' + l.approval_status.toLowerCase().split(' ')[0];
        const statusText = l.approval_status === 'Under Review' ? 'Pending Review' : l.approval_status;
        const imgUrl = getPrimaryImage(l);
        
        const deleteHtml = `
            <div style="display:flex; justify-content:flex-end; gap: 8px; padding-top:8px; border-top:1px solid var(--border-color); margin-top:12px;">
                <button class="icon-btn" style="font-size:12px; color:var(--brand-blue); background:transparent; border:none; cursor:pointer;" onclick="event.stopPropagation(); editListing('${l.id}')">
                    <i data-feather="edit-2" style="width:14px; margin-right:4px;"></i> Edit
                </button>
                <button class="icon-btn" style="font-size:12px; color:var(--status-rejected); background:transparent; border:none; cursor:pointer;" onclick="event.stopPropagation(); deleteListing('${l.id}', '${l.approval_status}')">
                    <i data-feather="trash-2" style="width:14px; margin-right:4px;"></i> Delete
                </button>
            </div>`;
            
        let feedbackHtml = '';
        if (l.approval_status === 'Changes Requested' && (l.latest_note || l.admin_feedback)) {
            feedbackHtml = `
            <div style="background-color:rgba(239, 68, 68, 0.1); color:#ef4444; padding:8px 12px; font-size:12px; border-radius:4px; margin-top:12px; border:1px solid rgba(239, 68, 68, 0.2);">
                <strong style="display:block; margin-bottom:4px;">Admin Feedback:</strong>
                ${l.latest_note || l.admin_feedback}
            </div>`;
        }
            
        return `
        <div class="listing-card" onclick="editListing('${l.id}')">
            <div class="card-image-wrap">
                <img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/400x200/111111/52525b'" class="card-image">
                <div class="card-status ${statusClass}">${statusText}</div>
            </div>
            <div class="card-content" style="position:relative;">
                <div class="card-title">${l.title || 'Untitled Listing'}</div>
                <div class="card-location"><i data-feather="map-pin" style="width:12px;"></i> ${l.location || 'Unknown Location'}</div>
                <div class="card-meta">
                    <div class="card-id">${l.id}</div>
                    <div class="card-price">${l.price || '--'}</div>
                </div>
                ${feedbackHtml}
                ${deleteHtml}
            </div>
        </div>
    `}).join('');
    feather.replace();
}

// Multi-step Editor Logic
function changeStep(dir) {
    document.getElementById(`step-${currentStep}`).style.display = 'none';
    document.querySelector(`.step-item[data-step="${currentStep}"]`).classList.remove('active');
    
    currentStep += dir;
    
    document.getElementById(`step-${currentStep}`).style.display = 'block';
    document.querySelector(`.step-item[data-step="${currentStep}"]`).classList.add('active');
    
    updateActionButtons();
}

function updateActionButtons() {
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnDraft = document.getElementById('btn-draft');
    const btnSubmit = document.getElementById('btn-submit');
    
    btnPrev.style.display = currentStep > 1 ? 'block' : 'none';
    
    if (currentStep === 6) {
        btnNext.style.display = 'none';
        btnDraft.style.display = 'block';
        btnSubmit.style.display = 'block';
    } else {
        btnNext.style.display = 'block';
        btnDraft.style.display = 'none';
        btnSubmit.style.display = 'none';
    }
}

window.changeStep = changeStep;

document.querySelectorAll('.step-item').forEach(item => {
    item.addEventListener('click', () => {
        const target = parseInt(item.getAttribute('data-step'));
        const dir = target - currentStep;
        if(dir !== 0) changeStep(dir);
    });
});

function resetEditor() {
    document.getElementById('listing-editor-form').reset();
    document.querySelectorAll('.feature-chip').forEach(c => c.classList.remove('selected'));
    uploadedMedia = { photos: [], video: null };
    editingListingId = null;
    const feedbackBanner = document.getElementById('admin-feedback-banner');
    if(feedbackBanner) feedbackBanner.style.display = 'none';
    const btnSubmit = document.getElementById('btn-submit');
    if(btnSubmit) {
        btnSubmit.textContent = 'Submit for Review';
        btnSubmit.onclick = () => saveListing('SUBMITTED');
    }
    
    // Clear media slots
    document.querySelectorAll('.media-input').forEach(input => {
        input.value = '';
        const preview = input.nextElementSibling;
        preview.style.display = 'none';
        preview.src = '';
    });
    
    if (currentStep !== 1) {
        changeStep(1 - currentStep);
    }
    
    const navItem = document.querySelector('.nav-item[data-target="new-listing-view"]');
    if (navItem) {
        navItem.innerHTML = '<i data-feather="plus-square"></i> New Listing';
        feather.replace();
    }
    
    updateLivePreview();
}

window.editListing = function(id) {
    console.log("editListing triggered for", id);
    const l = myListings.find(x => x.id === id);
    if (!l) return;
    
    resetEditor();
    editingListingId = l.id;
      
    let feedbackBanner = document.getElementById('admin-feedback-banner');
    // Dynamically create banner if it doesn't exist due to HTML caching
    if (!feedbackBanner) {
        const layout = document.querySelector('.editor-layout');
        if (layout) {
            feedbackBanner = document.createElement('div');
            feedbackBanner.id = 'admin-feedback-banner';
            feedbackBanner.style = 'display:none; position:absolute; top:10px; left:20px; right:20px; background:rgba(239, 68, 68, 0.1); border:1px solid #ef4444; color:#ef4444; padding:12px; border-radius:6px; z-index:100; font-size:14px;';
            feedbackBanner.innerHTML = '<strong>Admin Feedback / Requested Changes:</strong><div id="admin-feedback-text" style="margin-top:4px;"></div>';
            layout.appendChild(feedbackBanner);
        }
    }
    
    if (feedbackBanner && l.admin_feedback && l.admin_feedback.trim() !== '') {
        const feedbackText = document.getElementById('admin-feedback-text');
        if (feedbackText) feedbackText.textContent = l.admin_feedback;
        feedbackBanner.style.display = 'block';
        const btnSubmit = document.getElementById('btn-submit');
        if (btnSubmit) {
            btnSubmit.textContent = 'Resubmit for Review';
            btnSubmit.onclick = () => saveListing('RESUBMITTED');
        }
    } else if (feedbackBanner) {
        feedbackBanner.style.display = 'none';
        const btnSubmit = document.getElementById('btn-submit');
        if (btnSubmit) {
            btnSubmit.textContent = 'Submit for Review';
            btnSubmit.onclick = () => saveListing('SUBMITTED');
        }
    }
      
    document.getElementById('f-title').value = l.title || '';
    const specs = l.specs || {};
    document.getElementById('f-type').value = specs.property_type || l.property_type || 'Residential';
    document.getElementById('f-purpose').value = specs.purpose || l.purpose || 'Sale';
    document.getElementById('f-price').value = l.price || '';
    document.getElementById('f-locality').value = l.location || '';
    document.getElementById('f-desc').value = l.description || '';
    
    // Restore feature chips
    const features = specs.features || l.features || [];
    if (Array.isArray(features)) {
        document.querySelectorAll('.feature-chip').forEach(chip => {
            if (features.includes(chip.textContent)) {
                chip.classList.add('selected');
            }
        });
    }
    
    const media = l.media || {};
    const photos = media.photos || l.photos || [];
    if(Array.isArray(photos)) {
        photos.forEach((url, i) => {
            if(i < 4 && url) {
                uploadedMedia.photos[i] = url;
                const slot = document.querySelector(`.media-input[data-type="photo"][data-index="${i}"]`);
                if(slot) {
                    const preview = slot.nextElementSibling;
                    preview.src = url;
                    preview.style.display = 'block';
                }
            }
        });
    }
    const video = media.video || l.video;
    if(video) {
        uploadedMedia.video = video;
        const slot = document.querySelector('.media-input[data-type="video"]');
        const preview = slot.nextElementSibling;
        preview.src = video;
        preview.style.display = 'block';
    }
    
    updateMediaCounters();
    updateLivePreview();
    
    // Switch view manually to avoid triggering the nav click handler that resets the editor
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector('.nav-item[data-target="new-listing-view"]');
    navItem.classList.add('active');
    navItem.innerHTML = '<i data-feather="edit-3"></i> Edit Listing';
    feather.replace();
    
    document.querySelectorAll('.workspace-view').forEach(v => v.classList.remove('active'));
    document.getElementById('new-listing-view').classList.add('active');
}

// Features
function setupFeatureChips() {
    document.querySelectorAll('.feature-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('selected');
        });
    });
}

// Live Preview
function setupLivePreview() {
    const inputs = ['f-title', 'f-price', 'f-locality', 'f-type'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateLivePreview);
        document.getElementById(id).addEventListener('change', updateLivePreview);
    });
}

function updateLivePreview() {
    const pvTitle = document.getElementById('pv-title');
    const pvPrice = document.getElementById('pv-price');
    const pvLoc = document.getElementById('pv-loc');
    const pvSpecs = document.getElementById('pv-specs');
    
    if (pvTitle) pvTitle.textContent = document.getElementById('f-title').value || 'Listing Title';
    if (pvPrice) pvPrice.textContent = document.getElementById('f-price').value || '₹ --';
    if (pvLoc) pvLoc.textContent = document.getElementById('f-locality').value || 'Location';
    if (pvSpecs) pvSpecs.innerHTML = `<span style="background:var(--bg-main); padding:4px 8px; border-radius:4px; border:1px solid var(--border-color);">${document.getElementById('f-type').value || 'Type'}</span>`;
    
    const pvImg = document.getElementById('pv-image');
    if (pvImg) {
        if (uploadedMedia.photos.length > 0 && uploadedMedia.photos[0]) {
            pvImg.src = uploadedMedia.photos[0];
        } else {
            pvImg.src = 'https://placehold.co/400x240/111111/52525b?text=No+Image';
        }
    }
}

// Media Upload Logic
function setupMediaUploaders() {
    document.querySelectorAll('.media-slot').forEach(slot => {
        const input = slot.querySelector('.media-input');
        
        input.addEventListener('dragover', (e) => {
            e.preventDefault();
            slot.classList.add('drag-over');
        });
        input.addEventListener('dragleave', (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
        });
        input.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files[0], input);
            }
        });
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0], input);
            }
        });
    });
}

async function handleFileUpload(file, inputElement) {
    const type = inputElement.getAttribute('data-type');
    const index = parseInt(inputElement.getAttribute('data-index') || 0);
    const slot = inputElement.closest('.media-slot');
    const progress = slot.querySelector('.upload-progress');
    const preview = inputElement.nextElementSibling;
    
    if (type === 'photo' && !file.type.startsWith('image/')) {
        showToast('Please upload a valid image file', 'alert-triangle');
        return;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
        showToast('Please upload a valid video file', 'alert-triangle');
        return;
    }

    const formData = new FormData();
    formData.append('files', file);

    progress.style.width = '30%';
    
    try {
        const res = await fetchApi('/intern/upload', {
            method: 'POST',
            body: formData
        });
        progress.style.width = '80%';
        
        const data = await res.json();
        if (data.success && data.urls.length > 0) {
            const url = data.urls[0];
            
            if (type === 'photo') {
                uploadedMedia.photos[index] = url;
            } else {
                uploadedMedia.video = url;
            }
            
            preview.src = url;
            preview.style.display = 'block';
            progress.style.width = '100%';
            
            setTimeout(() => { progress.style.width = '0%'; }, 1000);
            updateLivePreview();
            updateMediaCounters();
            showToast('Media uploaded', 'check');
        }
    } catch(err) {
        console.error(err);
        progress.style.width = '0%';
        showToast('Upload failed', 'x');
    }
}

window.clearMediaSlot = function(btn) {
    const slot = btn.closest('.media-slot');
    const input = slot.querySelector('.media-input');
    const preview = slot.querySelector('.media-preview');
    
    const type = input.getAttribute('data-type');
    const index = parseInt(input.getAttribute('data-index') || 0);
    
    if (type === 'photo') {
        uploadedMedia.photos[index] = null;
    } else {
        uploadedMedia.video = null;
    }
    
    input.value = '';
    preview.src = '';
    preview.style.display = 'none';
    
    updateLivePreview();
    updateMediaCounters();
}

function updateMediaCounters() {
    const pCount = uploadedMedia.photos.filter(x => x).length;
    const vCount = uploadedMedia.video ? 1 : 0;
    document.getElementById('photo-count').textContent = pCount;
    document.getElementById('video-count').textContent = vCount;
    document.getElementById('rev-media-count').textContent = pCount + vCount;
}

window.saveListing = async function(status) {
    document.getElementById('save-status').textContent = 'Saving...';
    
    const features = [];
    document.querySelectorAll('.feature-chip.selected').forEach(c => features.push(c.textContent));
    const photos = uploadedMedia.photos.filter(x => x);

    // Map to backend expected structure
    const payload = {
        title: document.getElementById('f-title').value,
        description: document.getElementById('f-desc').value,
        price: document.getElementById('f-price').value,
        location: document.getElementById('f-locality').value,
        badge: 'New',
        image: photos.length > 0 ? photos[0] : '',
        specs: {
            property_type: document.getElementById('f-type').value,
            purpose: document.getElementById('f-purpose').value,
            specifications: [
                document.getElementById('f-area').value + ' ' + document.getElementById('f-unit').value,
                document.getElementById('f-facing').value,
                document.getElementById('f-ownership').value
            ].filter(x => x.trim().length > 1),
            features: features
        },
        media: {
            photos: photos,
            video: uploadedMedia.video || ''
        }
    };

    try {
        let res, data;
        
        // Save Draft or Update
        if (editingListingId) {
            res = await fetchApi('/intern/properties/' + editingListingId, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetchApi('/intern/properties', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }
        data = await res.json();
        
        if (!data.success) {
            showToast(data.message, 'x');
            document.getElementById('save-status').textContent = 'Save failed';
            return;
        }

        if (!editingListingId && data.property_id) {
            editingListingId = data.property_id;
        }

        // If user wants to submit for review, do it now
        if (status === 'SUBMITTED' || status === 'RESUBMITTED') {
            const endpoint = status === 'RESUBMITTED' ? '/resubmit' : '/submit';
            const submitRes = await fetchApi('/intern/properties/' + editingListingId + endpoint, {
                method: 'POST'
            });
            const submitData = await submitRes.json();
            if (!submitData.success) {
                showToast(submitData.message, 'x');
                document.getElementById('save-status').textContent = 'Submit failed';
                return;
            }
        }
        
        document.getElementById('save-status').textContent = 'Saved just now';
        showToast(status === 'DRAFT' ? 'Draft Saved' : 'Listing Submitted!', 'check');
        
        if (status !== 'DRAFT') {
            setTimeout(() => {
                document.querySelector('[data-target="my-listings-view"]').click();
            }, 1500);
        }
        
        loadDashboard();
    } catch(err) {
        console.error(err);
        showToast('Network error', 'alert-triangle');
        document.getElementById('save-status').textContent = 'Save failed';
    }
}

// Toasts
function showToast(msg, icon) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    document.getElementById('toast-icon').setAttribute('data-feather', icon);
    feather.replace();
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Chat Functions
function appendMessageToUI(msg, container) {
    const align = msg.sender_type === 'intern' ? 'flex-end' : 'flex-start';
    const bg = msg.sender_type === 'intern' ? 'var(--accent-color)' : 'var(--bg-main)';
    const color = msg.sender_type === 'intern' ? '#fff' : 'var(--text-primary)';
    
    const div = document.createElement('div');
    div.style.cssText = `align-self: ${align}; background: ${bg}; color: ${color}; padding: 10px 14px; border-radius: 8px; max-width: 70%; margin-bottom: 8px;`;
    div.innerHTML = `
        <div style="font-size: 14px;">${msg.message}</div>
        <div style="font-size: 10px; text-align: right; margin-top: 4px; opacity: 0.8;">${new Date(msg.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function loadChat() {
    try {
        const res = await fetchApi('/chat');
        const data = await res.json();
        if (data.success) {
            const container = document.getElementById('chat-messages');
            container.innerHTML = '';
            
            if (!data.data || data.data.length === 0) {
                container.innerHTML = '<div style="text-align:center; color:var(--text-secondary); margin-top:2rem;">Start a conversation with Admin</div>';
                return;
            }
            
            data.data.forEach(msg => {
                appendMessageToUI(msg, container);
            });
        }
    } catch(err) {
        console.error('Failed to load chat:', err);
    }
}

window.sendChatMessage = async function() {
    const input = document.getElementById('chat-input-field');
    const msg = input.value.trim();
    if (!msg) return;
    
    input.value = '';
    
    try {
        const res = await fetchApi('/chat', {
            method: 'POST',
            body: JSON.stringify({ message: msg, senderType: 'intern' })
        });
        const data = await res.json();
        if(data.success) {
            // optimistic append already handled if we wait for socket? 
            // Better to append it via the API response to get DB timestamp
            const container = document.getElementById('chat-messages');
            if (container.innerHTML.includes('Start a conversation')) {
                container.innerHTML = '';
            }
            appendMessageToUI(data.data, container);
        }
    } catch (err) {
        showToast('Failed to send message', 'x');
    }
}

window.deleteListing = async function(id, status) {
    console.log("deleteListing clicked! ID:", id, "Status:", status);
    const isDraft = status === 'Draft';
    const confirmMsg = isDraft 
        ? 'Are you sure you want to delete this draft?' 
        : 'Are you sure you want to delete this listing?';
        
    if (!confirm(confirmMsg)) return;
    
    try {
        const res = await fetchApi('/intern/properties/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('Listing deleted successfully', 'trash-2');
            const currentFilter = document.getElementById('listing-filter').value || 'ALL_SUBMITTED';
            const activeTab = document.querySelector('.nav-item[data-target="my-listings-view"].active');
            const filterToReload = activeTab ? (activeTab.getAttribute('data-filter') || 'ALL_SUBMITTED') : 'ALL_SUBMITTED';
            loadListings(filterToReload); // reload listings view with correct filter
        } else {
            showToast(data.message, 'x');
        }
    } catch(err) {
        showToast('Failed to delete', 'x');
    }
}
