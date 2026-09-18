with open('ADMIN_PANEL/app.min.js', 'r', encoding='utf-8') as f:
    code = f.read()

import re
code = re.sub(
    r'(?s)            // Populate Pending Reviews.*?            // Populate Approved Listings',
    '''            // Populate Pending Reviews\n            const tbody = document.getElementById('intern-reviews-table-body');\n            tbody.innerHTML = '';\n            const reviews = json.data.filter(l => l.status === 'SUBMITTED' || l.status === 'CHANGES REQUESTED');\n            \n            if(reviews.length === 0) {\n                tbody.innerHTML = '<tr><td colspan="6">No listings pending review.</td></tr>';\n            } else {\n                reviews.forEach(l => {\n                    const tr = document.createElement('tr');\n                    const dateStr = l.created_at ? new Date(l.created_at).toLocaleDateString('en-US', {day:'numeric', month:'short', year:'numeric'}) : '--';\n                    tr.innerHTML = \n                        <td>\</td>\n                        <td>\</td>\n                        <td>\</td>\n                        <td>\</td>\n                        <td><span class="badge badge-warning">\</span></td>\n                        <td style="display:flex; gap:8px;">\n                            <button class="btn-primary" onclick="openReviewModal('\')">Review</button>\n                            <button class="btn-ghost" style="color:#dc2626; padding: 6px 10px;" onclick="requestDeleteListing('\')"><i data-feather="trash-2" style="width:16px;"></i></button>\n                        </td>\n                    ;\n                    tbody.appendChild(tr);\n                });\n            }\n            \n            // Populate Approved Listings''',
    code
)

code = re.sub(
    r'(?s)            // Populate Approved Listings.*            feather\.replace\(\);\n        \}',
    '''            // Populate Approved Listings\n            const approvedBody = document.getElementById('approved-listings-table-body');\n            approvedBody.innerHTML = '';\n            const approved = json.data.filter(l => l.status === 'APPROVED');\n            \n            if(approved.length === 0) {\n                approvedBody.innerHTML = '<tr><td colspan="5">No approved listings yet.</td></tr>';\n            } else {\n                approved.forEach(l => {\n                    const tr = document.createElement('tr');\n                    const dateStr = l.updated_at ? new Date(l.updated_at).toLocaleDateString('en-US', {day:'numeric', month:'short', year:'numeric'}) : '--';\n                    tr.innerHTML = \n                        <td>\</td>\n                        <td>\</td>\n                        <td>\</td>\n                        <td>\</td>\n                        <td>\n                            <button class="btn-secondary" onclick="openReviewModal('\')">View Details</button>\n                        </td>\n                    ;\n                    approvedBody.appendChild(tr);\n                });\n            }\n            \n            feather.replace();\n        }''',
    code
)

with open('ADMIN_PANEL/app.min.js', 'w', encoding='utf-8') as f:
    f.write(code)
with open('ADMIN_PANEL/app.js', 'w', encoding='utf-8') as f:
    f.write(code)
