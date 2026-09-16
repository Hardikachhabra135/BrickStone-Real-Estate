const fs = require('fs');
const code = `
  // Fetch properties from backend
  async function fetchProperties() {
    try {
      const res = await fetch('http://localhost:5000/api/properties');
      const data = await res.json();
      if (data.success && data.data) {
        // Populate propertiesData for modal
        data.data.forEach(p => {
          propertiesData[p.id] = {
            id: p.id,
            badge: p.status === 'Available' ? 'For Sale' : p.status,
            image: 'images/hero.jpg', // Default image since we don't have db images
            title: p.title,
            price: '$' + parseFloat(p.price).toLocaleString(),
            location: p.location,
            specs: [],
            description: p.description || ''
          };
        });

        // Render to grid if present
        const grid = document.querySelector('.properties-grid');
        if (grid) {
          grid.innerHTML = data.data.map(p => \`
            <article class="property-card reveal active">
                <div class="card-img-wrapper">
                    <span class="badge">\${p.status === 'Available' ? 'For Sale' : p.status}</span>
                    <span class="fav-icon">♡</span>
                    <img src="images/hero.jpg" alt="\${p.title}">
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <h3 class="property-title">\${p.title}</h3>
                        <span class="property-price">$\${parseFloat(p.price).toLocaleString()}</span>
                    </div>
                    <p class="property-location">\${p.location}</p>
                    <div class="property-specs"></div>
                    <a href="javascript:void(0)" class="btn-secondary view-details-btn" data-property="\${p.id}">View Details →</a>
                </div>
            </article>
          \`).join('');

          // Re-attach modal listeners
          document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', () => openModal(btn.dataset.property));
          });
        }
      }
    } catch(e) { console.error('Error fetching properties', e); }
  }
  fetchProperties();
`;
fs.appendFileSync('FRONTEND/script.js', code);
