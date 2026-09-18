import re

def rewrite(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    
    match1 = re.search(r'async function loadInterns\(\) \{.*?(?=async function toggleInternStatus)', c, re.DOTALL)
    if not match1:
        print('no loadInterns')
        return

    new_interns = """async function loadInterns() {
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
"""
    c = c[:match1.start()] + new_interns + c[match1.end():]

    match2 = re.search(r'async function loadInternListings\(\) \{.*?(?=// Hook into nav clicks for interns-content|document\.querySelectorAll\(\'\.nav-item\'\))', c, re.DOTALL)
    if not match2:
        print('no list')
        return

    new_list = """async function loadInternListings() {
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
"""
    c = c[:match2.start()] + new_list + '\n\n' + c[match2.end():]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

rewrite('ADMIN_PANEL/app.js')
rewrite('ADMIN_PANEL/app.min.js')
print('success')
