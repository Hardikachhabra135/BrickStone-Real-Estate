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
