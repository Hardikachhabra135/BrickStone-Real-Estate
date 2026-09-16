const fs = require('fs');
let script = fs.readFileSync('FRONTEND/script.js', 'utf-8');

// 1. Change propertiesData to be globally available so it doesn't cause errors
script = script.replace('const propertiesData = {', 'window.propertiesData = {');
script = script.replace(/propertiesData\[propertyId\]/g, 'window.propertiesData[propertyId]');

// 2. Append fetchProperties inside the DOMContentLoaded block
const appendCode = `

  // Fetch properties from backend
  async function fetchProperties() {
    try {
      const res = await fetch('http://localhost:5000/api/properties');
      const data = await res.json();
      if (data.success && data.data) {
        // Populate propertiesData for modal
        data.data.forEach(p => {
          window.propertiesData[p.id] = {
            id: p.id,
            badge: p.status === 'Available' ? 'For Sale' : p.status,
            image: p.image || 'images/hero.jpg',
            title: p.title,
            price: p.price,
            location: p.location,
            specs: p.specs || [],
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
                    <img src="\${p.image || 'images/hero.jpg'}" alt="\${p.title}">
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <h3 class="property-title">\${p.title}</h3>
                        <span class="property-price">\${p.price}</span>
                    </div>
                    <p class="property-location">\${p.location}</p>
                    <div class="property-specs">
                        \${(p.specs || []).map(s => \`<span>\${s}</span>\`).join('')}
                    </div>
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

const lastBracketIndex = script.lastIndexOf('});');
if (lastBracketIndex !== -1) {
    script = script.substring(0, lastBracketIndex) + appendCode + script.substring(lastBracketIndex);
}

fs.writeFileSync('FRONTEND/script.js', script);
console.log('script.js appended successfully!');
