import re

with open('ADMIN_PANEL/app.min.js', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"approved\.forEach\(l => \{.*?approvedBody\.appendChild\(tr\);\s*\}\);"

replacement = '''approved.forEach(l => {
                    const tr = document.createElement('tr');
                    const dateStr = l.updated_at ? new Date(l.updated_at).toLocaleDateString('en-US', {day:'numeric', month:'short', year:'numeric'}) : '--';
                    
                    const publishBadge = l.is_published ? <span style="display:inline-flex;align-items:center;background:#dcfce7;color:#166534;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:600;margin-left:10px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Published</span> : '';
                    
                    tr.innerHTML = 
                        <td>\</td>
                        <td>\</td>
                        <td>\</td>
                        <td>\ \</td>
                        <td>
                            <button class="btn-secondary" onclick="openReviewModal('\')">View Details</button>
                        </td>
                    ;
                    approvedBody.appendChild(tr);
                });'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('ADMIN_PANEL/app.min.js', 'w', encoding='utf-8') as f:
    f.write(content)
