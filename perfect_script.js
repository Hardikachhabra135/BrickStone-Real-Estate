const fs = require('fs');

let script = fs.readFileSync('FRONTEND/script.js', 'utf-8');

// We need to dynamically update the window.propertiesData so the modal can show new properties
script = script.replace('const propertiesData = {', 'window.propertiesData = {');
script = script.replace(/propertiesData\[propertyId\]/g, 'window.propertiesData[propertyId]');

const fetchLogic = `
  // Fetch properties from backend and update UI
  async function fetchProperties() {
    try {
      const res = await fetch('http://localhost:5000/api/properties');
      const data = await res.json();
      if (data.success && data.data) {
        
        // 1. Add all properties to the global modal dictionary
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

        // 2. Identify if we are on the Home page or Properties page
        const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
        
        // On home page, we only show 3 properties to match original design.
        const displayData = isHomePage ? data.data.slice(0, 3) : data.data;

        // 3. Inject into grid
        const grid = document.querySelector('.properties-grid');
        if (grid) {
          grid.innerHTML = displayData.map(p => {
            const specsHtml = (p.specs || []).map(s => \`<span>\${s}</span>\`).join('');
            const badgeText = p.status === 'Available' ? 'For Sale' : p.status;
            
            // Note: We use "reveal" without "active" so the scroll observer animates them normally!
            // We use the exact heart and arrow characters from original HTML.
            return \`
                  <article class="property-card reveal">
                      <div class="card-img-wrapper">
                          <span class="badge">\${badgeText}</span>
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
                              \${specsHtml}
                          </div>
                          <a href="javascript:void(0)" class="btn-secondary view-details-btn" data-property="\${p.id}">View Details →</a>
                      </div>
                  </article>
            \`;
          }).join('');

          // 4. Re-attach IntersectionObserver for animation to new elements
          const revealEls = grid.querySelectorAll('.reveal');
          // (We'll just re-use the existing revealObserver if we could, but we can't easily access it from here, 
          //  so we create a new one just for these items)
          const localObserver = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add('active');
                  localObserver.unobserve(entry.target);
                }
              });
            },
            { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
          );
          revealEls.forEach(el => localObserver.observe(el));

          // 5. Re-attach View Details click listeners
          grid.querySelectorAll('.view-details-btn').forEach(btn => {
            // Need to make sure openModal is globally accessible if it isn't.
            // Wait, openModal is declared inside DOMContentLoaded, we can just call it here since fetchProperties is also inside.
            btn.addEventListener('click', () => {
                if (typeof openModal === 'function') openModal(btn.dataset.property);
            });
          });
        }
      }
    } catch(e) {
      console.error('Error fetching properties from backend:', e);
    }
  }

  fetchProperties();
`;

// Inject into the end of DOMContentLoaded block
const lastBracket = script.lastIndexOf('});');
if (lastBracket !== -1) {
    script = script.substring(0, lastBracket) + fetchLogic + '\n' + script.substring(lastBracket);
}

fs.writeFileSync('FRONTEND/script.js', script);
console.log('Script updated successfully with perfect graphics formatting.');
