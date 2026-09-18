const API_BASE = window.ENV ? window.ENV.API_URL : 'https://brickstone-real-estate.onrender.com/api';
let authToken = localStorage.getItem('internToken');
let currentUser = JSON.parse(localStorage.getItem('internUser') || 'null');
let myListings = [];
let currentStep = 1;
let uploadedMedia = { photos: [], video: null };
let editingListingId = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (authToken && currentUser) {
        showApp();
    } else {
        document.getElementById('login-view').style.display = 'flex';
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

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('login-id').value;
    const password = document.getElementById('login-pass').value;
    
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
            document.getElementById('login-view').style.display = 'none';
            showApp();
        } else {
            showToast(data.message, 'alert-circle');
        }
    } catch(err) {
        console.error(err);
        showToast('Login failed', 'alert-circle');
    }
});

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('internToken');
    localStorage.removeItem('internUser');
    document.getElementById('login-view').style.display = 'flex';
}

function showApp() {
    document.getElementById('display-user-name').textContent = currentUser.name || currentUser.username;
    document.getElementById('greeting-name').textContent = (currentUser.name || currentUser.username).toUpperCase();
    loadDashboard();
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
            if(item.getAttribute('data-target') === 'my-listings-view') loadListings();
            if(item.getAttribute('data-target') === 'new-listing-view') resetEditor();
        });
    });
}

// Dashboard & Listings
async function loadDashboard() {
    try {
        const res = await fetchApi('/intern-listings');
        const json = await res.json();
        if(json.success) {
            myListings = json.data;
            updateDashboardKPIs();
            renderRecentListings();
        }
    } catch(err) {
        console.error(err);
    }
}

async function loadListings() {
    await loadDashboard(); // refresh data
    renderListingsGrid('ALL');
}

document.getElementById('listing-filter').addEventListener('change', (e) => {
    renderListingsGrid(e.target.value);
});

function updateDashboardKPIs() {
    const drafts = myListings.filter(l => l.status === 'DRAFT').length;
    const pending = myListings.filter(l => l.status === 'SUBMITTED').length;
    const changes = myListings.filter(l => l.status === 'CHANGES REQUESTED').length;
    const approved = myListings.filter(l => l.status === 'APPROVED').length;
    
    document.getElementById('kpi-drafts').textContent = drafts;
    document.getElementById('kpi-pending').textContent = pending;
    document.getElementById('kpi-changes').textContent = changes;
    document.getElementById('kpi-approved').textContent = approved;
}

function renderRecentListings() {
    const container = document.getElementById('recent-listings-container');
    const recent = myListings.slice(0, 3);
    
    if (recent.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:2rem;">No recent listings</div>';
        return;
    }
    
    container.innerHTML = recent.map(l => `
        <div class="activity-item" style="cursor:pointer;" onclick="editListing('${l.id}')">
            <img src="${l.primary_photo || 'https://via.placeholder.com/60x60/111111/52525b'}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">
            <div>
                <div style="font-weight:500; font-size:14px; color:var(--text-primary);">${l.title || 'Untitled'}</div>
                <div style="font-size:12px; color:var(--text-secondary);">${l.location || 'No location'} â€¢ ${l.price || '--'}</div>
                <span style="font-size:10px; margin-top:4px; display:inline-block; color:var(--status-${l.status.toLowerCase().replace(' requested','s')})">${l.status}</span>
            </div>
        </div>
    `).join('');
}

function renderListingsGrid(filter) {
    const grid = document.getElementById('listings-grid');
    const filtered = filter === 'ALL' ? myListings : myListings.filter(l => l.status === filter);
    
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
        const statusClass = 'status-' + l.status.toLowerCase().split(' ')[0];
        return `
        <div class="listing-card" onclick="editListing('${l.id}')">
            <div class="card-image-wrap">
                <img src="${l.primary_photo || 'https://via.placeholder.com/400x200/111111/52525b'}" class="card-image">
                <div class="card-status ${statusClass}">${l.status}</div>
            </div>
            <div class="card-content">
                <div class="card-title">${l.title || 'Untitled Listing'}</div>
                <div class="card-location"><i data-feather="map-pin" style="width:12px;"></i> ${l.location || 'Unknown Location'}</div>
                <div class="card-meta">
                    <div class="card-id">${l.id}</div>
                    <div class="card-price">${l.price || '--'}</div>
                </div>
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
    const l = myListings.find(x => x.id === id);
    if (!l) return;
    
    resetEditor();
          editingListingId = l.id;
      
      const feedbackBanner = document.getElementById('admin-feedback-banner');
      if (l.admin_feedback && l.admin_feedback.trim() !== '') {
          document.getElementById('admin-feedback-text').textContent = l.admin_feedback;
          feedbackBanner.style.display = 'block';
      } else {
          feedbackBanner.style.display = 'none';
      }
      
      document.getElementById('f-title').value = l.title || '';
    document.getElementById('f-type').value = l.property_type || 'Residential';
    document.getElementById('f-purpose').value = l.purpose || 'Sale';
    document.getElementById('f-price').value = l.price || '';
    document.getElementById('f-locality').value = l.location || '';
    document.getElementById('f-desc').value = l.description || '';
    
    // Restore feature chips
    if (l.features && Array.isArray(l.features)) {
        document.querySelectorAll('.feature-chip').forEach(chip => {
            if (l.features.includes(chip.textContent)) {
                chip.classList.add('selected');
            }
        });
    }
    
    if(l.photos && Array.isArray(l.photos)) {
        l.photos.forEach((url, i) => {
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
    if(l.video) {
        uploadedMedia.video = l.video;
        const slot = document.querySelector('.media-input[data-type="video"]');
        const preview = slot.nextElementSibling;
        preview.src = l.video;
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
    document.getElementById('pv-title').textContent = document.getElementById('f-title').value || 'Listing Title';
    document.getElementById('pv-price').textContent = document.getElementById('f-price').value || 'â‚¹ --';
    document.getElementById('pv-loc').textContent = document.getElementById('f-locality').value || 'Location';
    document.getElementById('pv-specs').innerHTML = `<span style="background:var(--bg-main); padding:4px 8px; border-radius:4px; border:1px solid var(--border-color);">${document.getElementById('f-type').value || 'Type'}</span>`;
    
    const pvImg = document.getElementById('pv-image');
    if (uploadedMedia.photos.length > 0 && uploadedMedia.photos[0]) {
        pvImg.src = uploadedMedia.photos[0];
    } else {
        pvImg.src = 'https://via.placeholder.com/400x240/111111/52525b?text=No+Image';
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
        const res = await fetchApi('/upload', {
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

    const payload = {
        title: document.getElementById('f-title').value,
        property_type: document.getElementById('f-type').value,
        purpose: document.getElementById('f-purpose').value,
        price: document.getElementById('f-price').value,
        location: document.getElementById('f-locality').value,
        specifications: [
            document.getElementById('f-area').value + ' ' + document.getElementById('f-unit').value,
            document.getElementById('f-facing').value,
            document.getElementById('f-ownership').value
        ].filter(x => x.trim().length > 1),
        description: document.getElementById('f-desc').value,
        features: features,
        photos: photos,
        primary_photo: photos.length > 0 ? photos[0] : '',
        video: uploadedMedia.video || '',
        status: status
    };

    if (editingListingId) {
        payload.id = editingListingId;
    }

    try {
        const res = await fetchApi('/intern-listings', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(data.success) {
            document.getElementById('save-status').textContent = 'Saved just now';
            showToast(status === 'SUBMITTED' ? 'Listing Submitted!' : 'Draft Saved', 'check');
            
            if (status === 'SUBMITTED') {
                setTimeout(() => {
                    document.querySelector('[data-target="my-listings-view"]').click();
                }, 1500);
            } else {
                if (!editingListingId && data.data && data.data.id) {
                    editingListingId = data.data.id;
                }
            }
            loadDashboard();
        } else {
            showToast(data.message, 'x');
            document.getElementById('save-status').textContent = 'Save failed';
        }
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

