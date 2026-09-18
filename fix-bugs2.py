import os
import re

def fix_js(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix src preview
    content = re.sub(
        r"if \(src\.startsWith\('images/'\)\) \{\s*src = /\$\{src\};\s*\}",
        r"if (src.startsWith('images/')) {\n        src = 'https://brick-stone-frontend.vercel.app/' + src;\n    }",
        content
    )

    # Fix loadAllData
    content = re.sub(
        r"function loadAllData\(\) \{\s*loadDashboardStats\(\);\s*loadCharts\(\);\s*loadProperties\(\);\s*loadEnquiries\(\);\s*loadContacts\(\);\s*loadAboutSection\(\);\s*loadAdminTestimonials\(\);\s*\}",
        r"function loadAllData() {\n    loadDashboardStats();\n    loadCharts();\n    loadProperties();\n    loadEnquiries();\n    loadContacts();\n    loadAboutSection();\n    loadAdminTestimonials();\n    loadInterns();\n    loadInternListings();\n}",
        content
    )

    # Fix empty testimonials
    content = re.sub(
        r"tbody\.innerHTML = '';\s*tests\.forEach\(t => \{",
        r"tbody.innerHTML = '';\n    if (tests.length === 0) {\n        tbody.innerHTML = '<tr><td colspan=\"5\" style=\"text-align:center; padding:2rem; color:var(--text-muted);\">No testimonials found. Click \"Add Testimonial\" to create one.</td></tr>';\n        return;\n    }\n    tests.forEach(t => {",
        content
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_js('ADMIN_PANEL/app.js')
fix_js('ADMIN_PANEL/app.min.js')
print("Fixed!")
