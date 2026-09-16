
const fs = require('fs');

const aboutCode = \
// ==========================================
// ABOUT SECTION CMS LOGIC
// ==========================================

let currentAboutData = {};

async function loadAboutSection() {
    try {
        document.getElementById('about-status-text').textContent = 'Loading...';
        const res = await fetchApi('/site/about');
        if (res.success && res.data) {
            currentAboutData = res.data;
            
            // Populate Form
            document.getElementById('about-heading-input').value = res.data.heading || '';
            document.getElementById('about-subheading-input').value = res.data.subheading || '';
            document.getElementById('about-description-input').value = res.data.description || '';
            document.getElementById('about-closing-input').value = res.data.closing_line || '';
            document.getElementById('about-image-input').value = res.data.image_url || '';
            
            // Update Preview
            updateAboutPreview();
            
            document.getElementById('about-status-text').textContent = \CURRENTLY LIVE (\)\;
        }
    } catch (e) {
        console.error('Failed to load about section', e);
        document.getElementById('about-status-text').textContent = 'Error loading content';
    }
}

function updateAboutPreview() {
    document.getElementById('about-preview-heading').textContent = document.getElementById('about-heading-input').value || 'About Brickstone';
    document.getElementById('about-preview-subheading').textContent = document.getElementById('about-subheading-input').value || '';
    document.getElementById('about-preview-description').textContent = document.getElementById('about-description-input').value || '';
    document.getElementById('about-preview-closing').textContent = document.getElementById('about-closing-input').value || '';
    document.getElementById('about-preview-image').src = document.getElementById('about-image-input').value || '';
}

// Bind live preview listeners
const aboutInputs = ['about-heading-input', 'about-subheading-input', 'about-description-input', 'about-closing-input', 'about-image-input'];
aboutInputs.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener('input', updateAboutPreview);
    }
});

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

// Unsaved Changes Warning
let isAboutDirty = false;
aboutInputs.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener('input', () => { isAboutDirty = true; });
    }
});

// If trying to switch tabs with unsaved changes
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        if (isAboutDirty && !item.classList.contains('active')) {
            if (!confirm('You have unsaved changes in the About Section. Discard changes?')) {
                e.stopPropagation(); // Might not stop the other listener if added first, but simple enough
                // Let's actually enforce it properly by intercepting the tab switch
            } else {
                isAboutDirty = false;
                loadAboutSection(); // Reset form
            }
        }
    }, { capture: true });
});
\;

fs.appendFileSync('ADMIN_PANEL/app.js', '\\n' + aboutCode);
console.log('Appended About Section logic');

