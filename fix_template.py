with open('ADMIN_PANEL/app.min.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the botched string concats
code = code.replace(
    '''tr.innerHTML = \n                        <td> + l.id + </td>\n                        <td> + dateStr + </td>\n                        <td> + l.intern_name + </td>\n                        <td> + l.title + </td>\n                        <td><span class="badge badge-warning"> + l.status + </span></td>\n                        <td style="display:flex; gap:8px;">\n                            <button class="btn-primary" onclick="openReviewModal(' + l.id + ')">Review</button>\n                            <button class="btn-ghost" style="color:#dc2626; padding: 6px 10px;" onclick="requestDeleteListing(' + l.id + ')"><i data-feather="trash-2" style="width:16px;"></i></button>\n                        </td>\n                    ;''',
    '''tr.innerHTML = \n                        <td></td>\n                        <td></td>\n                        <td></td>\n                        <td></td>\n                        <td><span class="badge badge-warning"></span></td>\n                        <td style="display:flex; gap:8px;">\n                            <button class="btn-primary" onclick="openReviewModal('')">Review</button>\n                            <button class="btn-ghost" style="color:#dc2626; padding: 6px 10px;" onclick="requestDeleteListing('')"><i data-feather="trash-2" style="width:16px;"></i></button>\n                        </td>\n                    ;'''
)

code = code.replace(
    '''tr.innerHTML = \n                        <td> + l.id + </td>\n                        <td> + dateStr + </td>\n                        <td> + l.intern_name + </td>\n                        <td> + l.title + </td>\n                        <td>\n                            <button class="btn-secondary" onclick="openReviewModal(' + l.id + ')">View Details</button>\n                        </td>\n                    ;''',
    '''tr.innerHTML = \n                        <td></td>\n                        <td></td>\n                        <td></td>\n                        <td></td>\n                        <td>\n                            <button class="btn-secondary" onclick="openReviewModal('')">View Details</button>\n                        </td>\n                    ;'''
)

with open('ADMIN_PANEL/app.min.js', 'w', encoding='utf-8') as f:
    f.write(code)
with open('ADMIN_PANEL/app.js', 'w', encoding='utf-8') as f:
    f.write(code)
