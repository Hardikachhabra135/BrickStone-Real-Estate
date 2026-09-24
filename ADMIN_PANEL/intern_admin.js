/**
 * intern_admin.js — Brickstone Admin Panel
 * Extension script for Listing Interns section.
 * Loaded AFTER app.min.js. Overrides/extends intern-specific functions.
 * Localhost only. Do not deploy without environment review.
 */

// ===== CONFIGURATION =====
window._IAD_PORTAL_URL = 'http://localhost:8003/index.html';
// Keep a local alias for convenience
var PORTAL_LOCAL_URL = window._IAD_PORTAL_URL;

// ===== TOAST UTILITY =====
function showAdminToast(msg, type) {
    type = type || 'success';
    var toast = document.getElementById('admin-toast');
    var msgEl = document.getElementById('admin-toast-msg');
    var iconEl = document.getElementById('admin-toast-icon');
    if (!toast) return;

    var icons = {
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
        warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    };

    iconEl.innerHTML = icons[type] || icons.info;
    msgEl.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    toast.style.pointerEvents = 'auto';
    clearTimeout(window._adminToastTimer);
    window._adminToastTimer = setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.pointerEvents = 'none';
    }, 3500);
}

// ===== STATUS BADGE HELPER =====
function getStatusBadge(status) {
    var map = {
        'Draft':              { bg: '#f1f5f9', color: '#64748b', label: 'Draft' },
        'Under Review':       { bg: '#fef9c3', color: '#a16207', label: 'Pending Review' },
        'Changes Requested':  { bg: '#fff7ed', color: '#c2410c', label: 'Changes Req.' },
        'Approved':           { bg: '#dcfce7', color: '#15803d', label: 'Approved' },
        'Published':          { bg: '#dbeafe', color: '#1d4ed8', label: 'Published' },
        'Rejected':           { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' },
    };
    var s = map[status] || { bg: '#f1f5f9', color: '#64748b', label: status || 'Unknown' };
    return '<span style="display:inline-flex; align-items:center; background:' + s.bg + '; color:' + s.color + '; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap;">' + s.label + '</span>';
}

// ===== STATE (window-scoped to avoid duplicate let/const errors) =====
window._iad_currentInternDetailId = null;
window._iad_currentInternDetailData = null;
window._iad_currentDetailListingId = null;
window._iad_internToDelete = null;
window._iad_internToResetPassword = null;

// Shorthand accessors
function _iadGet(k) { return window['_iad_' + k]; }
function _iadSet(k, v) { window['_iad_' + k] = v; }

// ===== LOAD INTERNS TABLE (OVERRIDE) =====
// This overrides the loadInterns() defined in app.min.js
window.loadInterns = async function() {
    const tbody = document.getElementById('interns-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem;">
        <div style="display:inline-flex; align-items:center; gap:10px; color:var(--text-light);">
            <svg style="animation:spin 1s linear infinite;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.3"></circle><path d="M12 2 a10 10 0 0 1 10 10"></path></svg>
            Loading interns...
        </div>
    </td></tr>`;

    try {
        const json = await fetchApi('/admin/interns');
        if (!json.success) throw new Error(json.message || 'Failed to load interns');

        tbody.innerHTML = '';
        if (!json.data || json.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:3rem; color:var(--text-light);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:1rem; opacity:0.4;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg><br/>
                No listing interns registered yet.<br/>Click <b>Add Listing Intern</b> to generate an onboarding link.
            </td></tr>`;
            if (window.feather) feather.replace();
            return;
        }

        json.data.forEach(i => {
            const totalListings = (i.total_properties || 0);
            const pendingListings = (i.pending_properties || 0);
            const approvedListings = (i.approved_properties || 0);
            const changesListings = (i.changes_requested || 0);
            const publishedListings = (i.published_properties || 0);

            // Listing count pill
            let listingPill = `<div style="text-align:center;">
                <div style="font-size:24px; font-weight:700; color:var(--text-dark);">${totalListings}</div>
                <div style="display:flex; gap:4px; justify-content:center; margin-top:6px; flex-wrap:wrap;">`;
            if (pendingListings > 0) listingPill += `<span style="background:#fef9c3; color:#a16207; padding:2px 6px; border-radius:8px; font-size:10px; font-weight:600;">${pendingListings} pending</span>`;
            if (changesListings > 0) listingPill += `<span style="background:#fff7ed; color:#c2410c; padding:2px 6px; border-radius:8px; font-size:10px; font-weight:600;">${changesListings} changes</span>`;
            if (approvedListings > 0) listingPill += `<span style="background:#dcfce7; color:#15803d; padding:2px 6px; border-radius:8px; font-size:10px; font-weight:600;">${approvedListings} approved</span>`;
            if (publishedListings > 0) listingPill += `<span style="background:#dbeafe; color:#1d4ed8; padding:2px 6px; border-radius:8px; font-size:10px; font-weight:600;">${publishedListings} published</span>`;
            if (totalListings === 0) listingPill += `<span style="color:var(--text-light); font-size:11px;">No listings yet</span>`;
            listingPill += `</div></div>`;

            const statusBadge = i.status === 'Active'
                ? `<span style="display:inline-flex; align-items:center; background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600;"><span style="width:6px;height:6px;background:#16a34a;border-radius:50%;margin-right:6px;"></span>Active</span>`
                : `<span style="display:inline-flex; align-items:center; background:#f1f5f9; color:#64748b; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600;"><span style="width:6px;height:6px;background:#94a3b8;border-radius:50%;margin-right:6px;"></span>Inactive</span>`;

            const portalUrl = PORTAL_LOCAL_URL + '?id=' + encodeURIComponent(i.intern_id);
            const initials = (i.name || '--').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:38px; height:38px; background:linear-gradient(135deg,#3b2f29,#b89c72); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; color:white; flex-shrink:0;">${initials}</div>
                        <div>
                            <button onclick="openInternDetail(${i.id})" style="background:none; border:none; cursor:pointer; font-weight:600; color:var(--primary-color); font-size:14px; padding:0; text-align:left; text-decoration:underline; text-underline-offset:2px;">${i.name}</button>
                            <div style="font-size:11px; font-family:monospace; background:var(--surface-light); padding:2px 6px; border-radius:4px; display:inline-block; margin-top:4px;">${i.intern_id}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-size:13px; font-weight:500;">${i.territory || 'Unassigned'}</div>
                    <div style="font-size:12px; color:var(--text-light); margin-top:4px;">Target: ${i.monthly_target || 0}/mo</div>
                </td>
                <td>${listingPill}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <input type="text" value="${portalUrl}" readonly style="font-family:monospace; font-size:11px; padding:5px 7px; border:1px solid var(--border-color); border-radius:4px; width:200px; background:var(--surface-light); color:var(--text-muted);">
                        <button title="Copy link" onclick="copyPortalLink('${i.intern_id}', this)" style="width:32px; height:32px; border:1px solid var(--border-color); border-radius:6px; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <a href="${portalUrl}" target="_blank" title="Open portal" style="width:32px; height:32px; border:1px solid var(--border-color); border-radius:6px; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; text-decoration:none; color:inherit; flex-shrink:0; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </a>
                    </div>
                </td>
                <td>${statusBadge}</td>
                <td style="text-align:right;">
                    <div style="display:flex; align-items:center; justify-content:flex-end; gap:6px;">
                        <button title="Reset Password" onclick="openChangePasswordModal(${i.id}, '${i.name.replace(/'/g, "\\'")}')" style="width:32px; height:32px; border:1px solid var(--border-color); border-radius:6px; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </button>
                        ${i.status === 'Active'
                            ? `<button title="Deactivate Access" onclick="toggleInternStatus(${i.id}, 'Inactive')" style="width:32px; height:32px; border:1px solid var(--border-color); border-radius:6px; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;" onmouseover="this.style.background='#fffbeb'" onmouseout="this.style.background='white'">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="10" y1="15" x2="10" y2="9"></line><line x1="14" y1="15" x2="14" y2="9"></line></svg>
                            </button>`
                            : `<button title="Activate Access" onclick="toggleInternStatus(${i.id}, 'Active')" style="width:32px; height:32px; border:1px solid var(--border-color); border-radius:6px; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='white'">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            </button>`}
                        <button title="Deactivate Intern" onclick="requestDeleteIntern(${i.id}, '${i.name.replace(/'/g, "\\'")}')" style="width:32px; height:32px; border:1px solid var(--border-color); border-radius:6px; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='white'">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (window.feather) feather.replace();
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:#dc2626;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:1rem;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><br/>
            Failed to load intern data: ${err.message}<br/><br/>
            <button class="btn-secondary" onclick="loadInterns()">Retry</button>
        </td></tr>`;
        if (window.feather) feather.replace();
    }
};

// ===== COPY PORTAL LINK (OVERRIDE) =====
window.copyPortalLink = function(internId, btnElement) {
    const link = PORTAL_LOCAL_URL + '?id=' + encodeURIComponent(internId);
    navigator.clipboard.writeText(link).then(() => {
        const orig = btnElement.innerHTML;
        btnElement.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        btnElement.style.borderColor = '#16a34a';
        setTimeout(() => {
            btnElement.innerHTML = orig;
            btnElement.style.borderColor = '';
        }, 2000);
        showAdminToast('Portal link copied!', 'success');
    }).catch(() => {
        showAdminToast('Could not copy to clipboard', 'error');
    });
};

// ===== TOGGLE INTERN STATUS (OVERRIDE) =====
window.toggleInternStatus = async function(id, newStatus) {
    const label = newStatus === 'Active' ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${label} this intern's portal access?`)) return;
    try {
        const json = await fetchApi(`/admin/interns/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        if (!json.success) throw new Error(json.message);
        showAdminToast(`Intern ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`, 'success');
        loadInterns();
    } catch (err) {
        showAdminToast(err.message || 'Failed to update status', 'error');
    }
};

// ===== CHANGE PASSWORD MODAL (OVERRIDE) =====
window.openChangePasswordModal = function(id, name) {
    internToResetPassword = id;
    document.getElementById('cp-intern-id').value = id;
    const displayEl = document.getElementById('cp-intern-display-name');
    if (displayEl) displayEl.textContent = name || '';
    document.getElementById('cp-new-password').value = '';
    const confirmEl = document.getElementById('cp-confirm-password');
    if (confirmEl) confirmEl.value = '';
    document.getElementById('change-password-modal').classList.add('active');
};

window.handleChangePassword = async function(e) {
    e.preventDefault();
    const newPass = document.getElementById('cp-new-password').value;
    const confirmPassEl = document.getElementById('cp-confirm-password');
    const confirmPass = confirmPassEl ? confirmPassEl.value : newPass;

    if (newPass !== confirmPass) {
        showAdminToast('Passwords do not match!', 'error');
        return;
    }
    if (newPass.length < 6) {
        showAdminToast('Password must be at least 6 characters', 'warn');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Updating...';

    try {
        const id = document.getElementById('cp-intern-id').value;
        const json = await fetchApi(`/admin/interns/${id}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ new_password: newPass })
        });
        if (!json.success) throw new Error(json.message);
        closeModal('change-password-modal');
        showAdminToast('Password updated successfully. Share securely with the intern.', 'success');
    } catch (err) {
        showAdminToast(err.message || 'Failed to reset password', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
};

// ===== DELETE INTERN (OVERRIDE) =====
window.requestDeleteIntern = function(id, name) {
    internToDelete = id;
    const nameEl = document.getElementById('di-intern-name');
    if (nameEl) nameEl.textContent = name || 'this intern';
    document.getElementById('delete-intern-modal').classList.add('active');
};

window.confirmDeleteIntern = async function() {
    if (!internToDelete) return;
    try {
        const json = await fetchApi(`/admin/interns/${internToDelete}`, { method: 'DELETE' });
        closeModal('delete-intern-modal');
        if (json.success) {
            showAdminToast(json.message || 'Intern deactivated successfully', 'success');
        } else {
            showAdminToast(json.message || 'Failed to deactivate intern', 'error');
        }
        loadInterns();
    } catch (err) {
        showAdminToast(err.message || 'Failed to deactivate intern', 'error');
    } finally {
        internToDelete = null;
    }
};

// ===== INTERN DETAIL VIEW =====
window.openInternDetail = async function(internId) {
    currentInternDetailId = internId;

    // Show detail view, hide list view
    document.getElementById('interns-list-view').style.display = 'none';
    document.getElementById('intern-detail-view').style.display = 'block';
    document.getElementById('listing-detail-view').style.display = 'none';
    document.getElementById('intern-detail-table-body').innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem;">Loading...</td></tr>`;

    try {
        const json = await fetchApi(`/admin/interns/${internId}/properties`);
        if (!json.success) throw new Error(json.message);

        currentInternDetailData = json.data;
        const intern = json.intern;
        const stats = json.stats;

        // Breadcrumb & Profile
        document.getElementById('detail-breadcrumb-name').textContent = intern.name;
        const initials = (intern.name || '--').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        document.getElementById('detail-avatar').textContent = initials;
        document.getElementById('detail-intern-name').textContent = intern.name;
        document.getElementById('detail-intern-id').textContent = 'ID: ' + intern.intern_id;
        document.getElementById('detail-intern-territory').textContent = intern.territory ? '📍 ' + intern.territory : '';

        // Stats
        document.getElementById('detail-stat-total').textContent = stats.total;
        document.getElementById('detail-stat-pending').textContent = stats.pending;
        document.getElementById('detail-stat-approved').textContent = stats.approved + stats.published;
        document.getElementById('detail-stat-changes').textContent = stats.changes_requested;
        document.getElementById('detail-stat-published').textContent = stats.published;

        // Render table
        document.getElementById('detail-filter').value = 'ALL';
        renderInternDetailListings('ALL');

        if (window.feather) feather.replace();
    } catch (err) {
        document.getElementById('intern-detail-table-body').innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:#dc2626;">${err.message}</td></tr>`;
    }
};

window.backToInterns = function() {
    document.getElementById('interns-list-view').style.display = 'block';
    document.getElementById('intern-detail-view').style.display = 'none';
    document.getElementById('listing-detail-view').style.display = 'none';
    currentInternDetailId = null;
    currentDetailListingId = null;
    if (window.feather) feather.replace();
};

window.goBackToInternDetail = function() {
    if (currentInternDetailId) {
        document.getElementById('intern-detail-view').style.display = 'block';
        document.getElementById('listing-detail-view').style.display = 'none';
    } else {
        backToInterns();
    }
    if (window.feather) feather.replace();
};

window.renderInternDetailListings = function(filter) {
    const tbody = document.getElementById('intern-detail-table-body');
    if (!currentInternDetailData) return;

    let filtered = currentInternDetailData;
    if (filter && filter !== 'ALL') {
        filtered = currentInternDetailData.filter(p => p.approval_status === filter);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:3rem; color:var(--text-light);">No listings found for this filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const date = p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '--';
        return `<tr>
            <td style="font-family:monospace; font-size:12px; color:var(--text-light);">#${p.id}</td>
            <td>
                <button onclick="openListingDetail(${p.id})" style="background:none; border:none; cursor:pointer; font-weight:500; color:var(--primary-color); font-size:13px; padding:0; text-align:left; text-decoration:underline; text-underline-offset:2px;">${p.title || 'Untitled'}</button>
            </td>
            <td style="font-size:13px; color:var(--text-secondary);">${p.location || '--'}</td>
            <td style="font-size:13px; font-weight:500;">${p.price || '--'}</td>
            <td style="font-size:12px; color:var(--text-light);">${date}</td>
            <td>${getStatusBadge(p.approval_status)}</td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button onclick="openListingDetail(${p.id})" title="Review" style="padding:5px 10px; border:1px solid var(--border-color); border-radius:6px; background:white; cursor:pointer; font-size:12px; font-weight:500; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">Review</button>
                    ${p.approval_status !== 'Published' && p.approval_status !== 'Approved'
                        ? `<button onclick="adminDeleteListing(${p.id})" title="Delete" style="width:30px; height:30px; border:1px solid var(--border-color); border-radius:6px; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#dc2626; flex-shrink:0; transition:background 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='white'">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
                        </button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
};

// ===== LISTING DETAIL VIEW =====
window.openListingDetail = async function(listingId) {
    currentDetailListingId = listingId;

    // Show listing detail view, hide others
    document.getElementById('intern-detail-view').style.display = 'none';
    document.getElementById('listing-detail-view').style.display = 'block';
    document.getElementById('listing-detail-content').innerHTML = `<div style="text-align:center; padding:3rem; color:var(--text-light);">Loading listing details...</div>`;

    // Update breadcrumb
    const internName = document.getElementById('detail-intern-name') ? document.getElementById('detail-intern-name').textContent : 'Intern';
    document.getElementById('listing-breadcrumb-intern').textContent = internName;

    // Find listing from currentInternDetailData or currentInternListings
    let listing = null;
    if (currentInternDetailData) {
        listing = currentInternDetailData.find(l => l.id === listingId || l.id === parseInt(listingId));
    }
    if (!listing && window.currentInternListings) {
        listing = window.currentInternListings.find(l => l.id === listingId || String(l.id) === String(listingId));
    }

    if (!listing) {
        // Fetch from API
        try {
            const json = await fetchApi(`/admin/intern-properties?id=${listingId}`);
            listing = json.data && json.data.length > 0 ? json.data[0] : null;
        } catch(e) {}
    }

    if (!listing) {
        document.getElementById('listing-detail-content').innerHTML = `<div style="text-align:center; padding:3rem; color:#dc2626;">Listing not found.</div>`;
        return;
    }

    document.getElementById('listing-breadcrumb-title').textContent = listing.title || '#' + listingId;

    // Parse media/specs
    let specs = {};
    let media = { photos: [], video: '' };
    try { specs = typeof listing.specs === 'string' ? JSON.parse(listing.specs) : (listing.specs || {}); } catch(e) {}
    try { media = typeof listing.media === 'string' ? JSON.parse(listing.media) : (listing.media || { photos: [], video: '' }); } catch(e) {}

    const photos = media.photos || [];
    const video = media.video || '';
    const specifications = specs.specifications || [];
    const features = specs.features || [];
    const propertyType = specs.property_type || listing.type || '--';
    const purpose = specs.purpose || '--';

    const isPublished = listing.approval_status === 'Published';
    const isApproved = listing.approval_status === 'Approved' || isPublished;
    const isPending = listing.approval_status === 'Under Review';
    const isChanges = listing.approval_status === 'Changes Requested';

    const latestNote = listing.latest_review_note || listing.admin_feedback || '';

    document.getElementById('listing-detail-content').innerHTML = `
        <div style="display:grid; grid-template-columns:2fr 1fr; gap:24px; align-items:flex-start;">

            <!-- LEFT: Listing Details -->
            <div style="display:flex; flex-direction:column; gap:20px;">

                <!-- Header -->
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <div>
                        <h2 style="margin:0; font-size:22px; font-weight:700;">${listing.title || 'Untitled'}</h2>
                        <div style="font-size:13px; color:var(--text-light); margin-top:4px;">
                            Submitted by <strong style="color:var(--text-dark);">${listing.intern_name || internName}</strong>
                            &nbsp;·&nbsp; ${getStatusBadge(listing.approval_status)}
                        </div>
                    </div>
                </div>

                <!-- Info Grid -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px;">
                        <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Property Type</div>
                        <div style="font-size:14px; font-weight:600; color:#0f172a;">${propertyType}</div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px;">
                        <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Purpose</div>
                        <div style="font-size:14px; font-weight:600; color:#0f172a;">${purpose}</div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px;">
                        <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Price</div>
                        <div style="font-size:14px; font-weight:600; color:#0f172a;">${listing.price || '--'}</div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px;">
                        <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Location</div>
                        <div style="font-size:14px; font-weight:600; color:#0f172a;">${listing.location || '--'}</div>
                    </div>
                </div>

                ${specifications.length > 0 ? `<div>
                    <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Specifications</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        ${specifications.filter(Boolean).map(s => `<span style="background:#f1f5f9; padding:6px 12px; font-size:13px; border-radius:6px; border:1px solid #e2e8f0; color:#334155;">${s}</span>`).join('')}
                    </div>
                </div>` : ''}

                ${features.length > 0 ? `<div>
                    <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Features</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        ${features.map(f => `<span style="background:#f8fafc; padding:4px 10px; font-size:12px; border-radius:12px; border:1px solid #cbd5e1; color:#475569;">✓ ${f}</span>`).join('')}
                    </div>
                </div>` : ''}

                <div>
                    <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Description</div>
                    <p style="font-size:14px; line-height:1.6; color:#475569; margin:0; white-space:pre-wrap; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px;">${listing.description || 'No description provided.'}</p>
                </div>

                ${photos.length > 0 || listing.image ? `<div>
                    <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Photos</div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:10px;">
                        ${(photos.length > 0 ? photos : [listing.image]).filter(Boolean).map(p => `
                            <img src="${p}" onclick="window.openLightbox && window.openLightbox('image', '${p}')" onerror="this.style.display='none'" style="width:100%; height:100px; object-fit:cover; border-radius:8px; cursor:pointer; border:1px solid #e2e8f0; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        `).join('')}
                    </div>
                </div>` : ''}

                ${video ? `<div>
                    <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Video Tour</div>
                    <video src="${video}" controls style="width:100%; border-radius:8px; border:1px solid #e2e8f0;"></video>
                </div>` : ''}

                ${latestNote ? `<div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:16px;">
                    <div style="font-size:11px; color:#92400e; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px;">Last Admin Note</div>
                    <div style="font-size:13px; color:#78350f; line-height:1.5;">${latestNote}</div>
                </div>` : ''}
            </div>

            <!-- RIGHT: Admin Actions -->
            <div style="display:flex; flex-direction:column; gap:16px; position:sticky; top:0;">

                <!-- Status card -->
                <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:20px; text-align:center;">
                    <div style="width:48px; height:48px; background:#f8fafc; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    </div>
                    <div style="font-weight:700; font-size:15px; color:#0f172a; margin-bottom:4px;">Review Submission</div>
                    <div style="font-size:12px; color:#64748b;">Current: ${getStatusBadge(listing.approval_status)}</div>
                </div>

                <!-- Feedback textarea -->
                <div>
                    <label style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px;">Feedback / Change Notes <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:normal; font-size:10px;">Optional</span></label>
                    <textarea id="ld-feedback" style="width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; resize:vertical; min-height:90px; background:#f8fafc; font-family:inherit;" placeholder="Enter specific instructions or feedback...">${latestNote}</textarea>
                </div>

                <!-- Edit Button -->
                <button onclick="adminEditInternListing(${listingId})" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border-radius:8px; font-weight:600; font-size:14px; cursor:pointer; background:white; color:var(--text-dark); border:1px solid var(--border-color); box-shadow:0 1px 3px rgba(0,0,0,0.05); transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Edit Listing
                </button>
                
                <!-- Action Buttons -->
                ${isPublished ? `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:10px; padding:16px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px;">
                        <div style="color:#166534; font-weight:700; font-size:15px; display:flex; align-items:center; gap:8px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            PUBLISHED
                        </div>
                        <div style="font-size:12px; color:#15803d;">This listing is live on the main website.</div>
                    </div>
                ` : `
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button onclick="adminPublishListing(${listingId})" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border-radius:8px; font-weight:600; font-size:14px; cursor:pointer; background:#16a34a; color:white; border:none; box-shadow:0 4px 12px rgba(22,163,74,0.2); transition:background 0.2s;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            Approve &amp; Publish
                        </button>
                        <button onclick="adminRequestChanges(${listingId})" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border-radius:8px; font-weight:600; font-size:14px; cursor:pointer; background:#fffbeb; color:#d97706; border:1px solid #fcd34d; transition:background 0.2s;" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='#fffbeb'">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Request Changes
                        </button>
                        <button onclick="adminRejectListing(${listingId})" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border-radius:8px; font-weight:600; font-size:14px; cursor:pointer; background:transparent; color:#dc2626; border:1px solid transparent; transition:background 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            Reject Listing
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;

    if (window.feather) feather.replace();
};

// ===== ADMIN LISTING ACTIONS =====
window.adminPublishListing = async function(listingId) {
    const feedback = document.getElementById('ld-feedback') ? document.getElementById('ld-feedback').value : '';
    if (!confirm('Approve and publish this listing to the main website?')) return;
    try {
        const json = await fetchApi(`/admin/intern-properties/${listingId}/publish`, {
            method: 'POST',
            body: JSON.stringify({ feedback })
        });
        if (!json.success) throw new Error(json.message);
        showAdminToast('Listing approved and published!', 'success');
        // Refresh
        if (currentInternDetailId) {
            await openInternDetail(currentInternDetailId);
            await openListingDetail(listingId);
        } else {
            loadInternListings && loadInternListings();
        }
    } catch (err) {
        showAdminToast(err.message || 'Failed to publish listing', 'error');
    }
};

window.adminRequestChanges = async function(listingId) {
    const feedback = document.getElementById('ld-feedback') ? document.getElementById('ld-feedback').value.trim() : '';
    if (!feedback) {
        showAdminToast('Please enter feedback notes for the intern before requesting changes.', 'warn');
        document.getElementById('ld-feedback') && document.getElementById('ld-feedback').focus();
        return;
    }
    try {
        const json = await fetchApi(`/admin/intern-properties/${listingId}/request-changes`, {
            method: 'POST',
            body: JSON.stringify({ note: feedback })
        });
        if (!json.success) throw new Error(json.message);
        showAdminToast('Changes requested — intern notified.', 'info');
        if (currentInternDetailId) {
            await openInternDetail(currentInternDetailId);
            await openListingDetail(listingId);
        } else {
            loadInternListings && loadInternListings();
        }
    } catch (err) {
        showAdminToast(err.message || 'Failed to request changes', 'error');
    }
};

window.adminRejectListing = async function(listingId) {
    const feedback = document.getElementById('ld-feedback') ? document.getElementById('ld-feedback').value : '';
    if (!confirm('Are you sure you want to reject this listing? The intern will be notified.')) return;
    try {
        const json = await fetchApi(`/admin/intern-properties/${listingId}/review`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'REJECTED', admin_feedback: feedback })
        });
        if (!json.success) throw new Error(json.message);
        showAdminToast('Listing rejected.', 'warn');
        if (currentInternDetailId) {
            await openInternDetail(currentInternDetailId);
            goBackToInternDetail();
        } else {
            loadInternListings && loadInternListings();
            backToInterns();
        }
    } catch (err) {
        showAdminToast(err.message || 'Failed to reject listing', 'error');
    }
};

window.adminDeleteListing = async function(listingId) {
    if (!confirm('Permanently delete this listing? This cannot be undone.')) return;
    try {
        const data = await fetchApi(`/admin/intern-properties/${listingId}`, { method: 'DELETE' });
        if (!data.success) throw new Error(data.message);
        showAdminToast('Listing deleted.', 'success');
        if (currentInternDetailId) {
            openInternDetail(currentInternDetailId);
        } else {
            loadInternListings && loadInternListings();
        }
    } catch (err) {
        showAdminToast(err.message || 'Failed to delete listing', 'error');
    }
};

// ===== FIX loadInternListings (STATUS SYNC) =====
// Override to use correct status values from DB
window.loadInternListings = async function() {
    const revBody = document.getElementById('intern-reviews-table-body');
    const appBody = document.getElementById('approved-listings-table-body');
    if (!revBody || !appBody) return;

    revBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem;">Loading...</td></tr>`;
    appBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem;">Loading...</td></tr>`;

    try {
        const json = await fetchApi('/admin/intern-properties');
        if (!json.success) throw new Error(json.message || 'Failed to load listings');

        window.currentInternListings = json.data;

        // Pending: 'Under Review' or 'Changes Requested'
        revBody.innerHTML = '';
        const reviews = json.data.filter(l => l.approval_status === 'Under Review' || l.approval_status === 'Changes Requested');
        if (reviews.length === 0) {
            revBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:3rem; color:var(--text-light);">No listings pending review.</td></tr>`;
        } else {
            reviews.forEach(l => {
                const dateStr = l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) : '--';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-family:monospace; font-size:12px;">#${l.id}</td>
                    <td style="font-size:12px;">${dateStr}</td>
                    <td style="font-weight:500;">${l.intern_name || '--'}</td>
                    <td>${l.title || '--'}</td>
                    <td>${getStatusBadge(l.approval_status)}</td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="btn-primary" onclick="openReviewModal(${l.id})" style="font-size:12px; padding:5px 10px;">Review</button>
                            <button title="Delete" onclick="adminDeleteListing(${l.id})" style="width:30px; height:30px; border:1px solid var(--border-color); border-radius:6px; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#dc2626; flex-shrink:0;" >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
                            </button>
                        </div>
                    </td>
                `;
                revBody.appendChild(tr);
            });
        }

        // Approved: 'Approved' or 'Published'
        appBody.innerHTML = '';
        const approved = json.data.filter(l => l.approval_status === 'Approved' || l.approval_status === 'Published');
        if (approved.length === 0) {
            appBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--text-light);">No approved listings yet.</td></tr>`;
        } else {
            approved.forEach(l => {
                const dateStr = l.updated_at ? new Date(l.updated_at).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) : '--';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-family:monospace; font-size:12px;">#${l.id}</td>
                    <td style="font-size:12px;">${dateStr}</td>
                    <td style="font-weight:500;">${l.intern_name || '--'}</td>
                    <td>
                        ${l.title || '--'}
                        ${l.approval_status === 'Published' ? `<span style="display:inline-flex; align-items:center; background:#dbeafe; color:#1d4ed8; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; margin-left:8px;">Published</span>` : ''}
                    </td>
                    <td>
                        <button class="btn-secondary" onclick="openReviewModal(${l.id})" style="font-size:12px; padding:5px 10px;">View Details</button>
                    </td>
                `;
                appBody.appendChild(tr);
            });
        }

        if (window.feather) feather.replace();
    } catch (err) {
        console.error(err);
        const errHtml = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:#dc2626;">${err.message}</td></tr>`;
        revBody.innerHTML = errHtml;
        appBody.innerHTML = errHtml;
    }
};

// ===== EDIT LISTING LOGIC =====
window.adminEditInternListing = function(listingId) {
    if (!currentInternDetailData && !window.currentInternListings) return;
    
    let listing = null;
    if (currentInternDetailData) {
        listing = currentInternDetailData.find(l => parseInt(l.id) === parseInt(listingId));
    }
    if (!listing && window.currentInternListings) {
        listing = window.currentInternListings.find(l => parseInt(l.id) === parseInt(listingId));
    }
    if (!listing) {
        showAdminToast('Could not load listing data for editing', 'error');
        return;
    }

    // Flag to tell the global form submit handler we are doing an intern property
    window._isEditingInternListing = true;

    // Populate existing `#property-modal`
    document.getElementById('prop-id').value = listing.id;
    document.getElementById('prop-title').value = listing.title || '';
    document.getElementById('prop-price').value = listing.price || '';
    document.getElementById('prop-location').value = listing.location || '';
    document.getElementById('prop-status').value = listing.market_status || 'Available';
    
    let specs = {};
    try { specs = typeof listing.specs === 'string' ? JSON.parse(listing.specs) : (listing.specs || {}); } catch(e) {}
    
    document.getElementById('prop-type').value = specs.property_type || listing.type || 'Residential';
    document.getElementById('prop-purpose').value = specs.purpose || 'Sale';
    document.getElementById('prop-beds').value = specs.bedrooms || '';
    document.getElementById('prop-baths').value = specs.bathrooms || '';
    document.getElementById('prop-area').value = specs.area || '';
    document.getElementById('prop-desc').value = listing.description || '';
    
    // Media preview
    document.getElementById('photo-preview-container').innerHTML = '';
    
    // Hijack the form submit exactly once
    const form = document.getElementById('property-form');
    const oldOnSubmit = form.onsubmit;
    
    // We clone the form to remove app.js event listeners, or just intercept fetchApi?
    // Easiest is to intercept fetchApi for /admin/properties
    
    document.getElementById('property-modal').classList.add('active');
};

// Intercept fetchApi globally to redirect PUT /admin/properties/:id to /admin/intern-properties/:id
const origFetchApi = window.fetchApi;
window.fetchApi = async function(url, options) {
    if (window._isEditingInternListing && options && options.method === 'PUT' && url.includes('/admin/properties/')) {
        url = url.replace('/admin/properties/', '/admin/intern-properties/');
        
        const res = await origFetchApi(url, options);
        if (res.success) {
            window._isEditingInternListing = false;
            // Refresh details
            if (currentDetailListingId) openListingDetail(currentDetailListingId);
        }
        return res;
    }
    return origFetchApi(url, options);
};

// ===== FIX openReviewModal to use current listing data =====
const _origOpenReviewModal = window.openReviewModal;
window.openReviewModal = function(id) {
    // Normalize id to number
    const numId = parseInt(id);

    // Search in currentInternDetailData first, then currentInternListings
    let listing = null;
    if (currentInternDetailData) {
        listing = currentInternDetailData.find(l => parseInt(l.id) === numId);
    }
    if (!listing && window.currentInternListings) {
        listing = window.currentInternListings.find(l => parseInt(l.id) === numId);
    }

    if (!listing) {
        if (_origOpenReviewModal) _origOpenReviewModal(id);
        return;
    }

    // Use the detail view instead of the modal if we came from intern detail
    if (currentInternDetailId) {
        openListingDetail(numId);
        return;
    }

    // Otherwise use original modal
    if (_origOpenReviewModal) _origOpenReviewModal(id);
};

// ===== INIT =====
// Fix tab click handlers to show correct sub-view
document.addEventListener('DOMContentLoaded', () => {
    // Re-initialize tab buttons within interns-list-view
    const internSection = document.getElementById('interns-content');
    if (internSection) {
        internSection.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                internSection.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                internSection.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                const target = document.getElementById(tab);
                if (target) target.classList.add('active');
            });
        });
    }

    if (window.feather) feather.replace();
});

// ===== ADMIN CHAT IMPLEMENTATION =====

let adminChatSocket = null;
// let currentChatInternId = null; // already defined in app.min.js

function setupAdminChatSocket() {
    if (!adminToken) return;
    const baseUrl = API_BASE.replace('/api', '');
    if (!adminChatSocket) {
        adminChatSocket = io(baseUrl);
        adminChatSocket.on('connect', () => {
            console.log('Admin connected to chat server');
        });

        adminChatSocket.on('receive_message', (msg) => {
            if (currentChatInternId == msg.conversation_id || currentChatInternId == msg.sender_id) { 
                // Note: internId doesn't exactly equal sender_id if it's admin, but sender_id is intern if intern sent it
                if (msg.sender_type === 'intern' && currentChatInternId == msg.sender_id) {
                    appendAdminChatMessageUI(msg);
                } else if (msg.sender_type === 'admin') {
                    // we already appended optimistically, but maybe we shouldn't?
                    // Actually, if we're connected to room, we might receive our own message.
                }
            } else {
                showAdminToast('New message from an intern', 'message-circle');
                loadChatInternsList(); // refresh the list to show unread or latest timestamp
            }
        });
    }
}

window.loadChatInternsList = async function() {
    try {
        const json = await fetchApi('/admin/interns');
        if (!json.success) throw new Error(json.message);
        
        const listDiv = document.getElementById('chat-intern-list');
        if (!listDiv) return;
        
        if (json.data.length === 0) {
            listDiv.innerHTML = '<div class="empty-state">No interns found.</div>';
            return;
        }

        listDiv.innerHTML = json.data.map(intern => `
            <div class="intern-chat-item" onclick="openInternChat(${intern.id}, '${intern.name}')" 
                style="padding: 12px; border-bottom: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.2s;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center; font-weight: 600; color: var(--primary-color);">
                    ${intern.name.substring(0, 2).toUpperCase()}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 500; font-size: 14px;">${intern.name}</div>
                    <div style="font-size: 12px; color: var(--text-light);">${intern.intern_id}</div>
                </div>
            </div>
        `).join('');
    } catch(err) {
        console.error(err);
    }
};

window.openInternChat = async function(internId, internName) {
    currentChatInternId = internId;
    document.getElementById('chat-header').textContent = `Chat with ${internName}`;
    
    // Join the intern's room to receive their real-time messages
    if (adminChatSocket) {
        adminChatSocket.emit('join_intern_room', internId);
    }

    // Highlight selected item
    document.querySelectorAll('.intern-chat-item').forEach(el => el.style.background = 'transparent');
    event.currentTarget.style.background = 'var(--bg-main)';

    const container = document.getElementById('admin-chat-messages');
    container.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-light);">Loading...</div>';

    try {
        const json = await fetchApi(`/admin/interns/${internId}/chat`);
        if (!json.success) throw new Error(json.message);
        
        container.innerHTML = '';
        if (json.data.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-light);">No messages yet.</div>';
            return;
        }

        json.data.forEach(msg => appendAdminChatMessageUI(msg));
    } catch(err) {
        console.error(err);
        container.innerHTML = '<div style="text-align:center; padding: 2rem; color: #dc2626;">Failed to load messages.</div>';
    }
};

function appendAdminChatMessageUI(msg) {
    const container = document.getElementById('admin-chat-messages');
    if (container.innerHTML.includes('No messages yet.')) {
        container.innerHTML = '';
    }

    const isMe = msg.sender_type === 'admin';
    const align = isMe ? 'flex-end' : 'flex-start';
    const bg = isMe ? 'var(--primary-color)' : 'var(--bg-main)';
    const color = isMe ? '#fff' : 'var(--text-primary)';
    
    const div = document.createElement('div');
    div.style.cssText = `align-self: ${align}; background: ${bg}; color: ${color}; padding: 10px 14px; border-radius: 8px; max-width: 70%; margin-bottom: 8px;`;
    div.innerHTML = `
        <div style="font-size: 14px;">${msg.message}</div>
        <div style="font-size: 10px; text-align: right; margin-top: 4px; opacity: 0.8;">${new Date(msg.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

window.sendAdminChatMessage = async function() {
    if (!currentChatInternId) {
        showAdminToast('Please select an intern first', 'alert-circle');
        return;
    }
    
    const input = document.getElementById('admin-chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    
    input.value = '';
    
    try {
        const json = await fetchApi(`/admin/interns/${currentChatInternId}/chat`, {
            method: 'POST',
            body: JSON.stringify({ message: msg, senderType: 'admin' })
        });
        if (json.success) {
            appendAdminChatMessageUI(json.data);
        } else {
            showAdminToast(json.message, 'x');
        }
    } catch (err) {
        console.error(err);
        showAdminToast('Failed to send message', 'x');
    }
};

// Hook into navigation clicks to load chat intern list when "Talk to Interns" is clicked
document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem && navItem.getAttribute('data-target') === 'interns-chat-content') {
        setupAdminChatSocket();
        loadChatInternsList();
    }
});

console.log('[intern_admin.js] Listing Interns extension loaded.');
