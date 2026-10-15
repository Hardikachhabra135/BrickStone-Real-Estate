document.addEventListener('DOMContentLoaded', () => {

  const API_BASE = window.ENV.API_URL;

  /* ---------- Mobile menu toggle ---------- */
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navLinksEl = document.querySelector('.nav-links');
  const navMenuEl = document.querySelector('.nav-menu');

  if (menuBtn && navLinksEl) {
    menuBtn.addEventListener('click', () => {
      const expanded = navLinksEl.classList.toggle('active');
      if (navMenuEl) navMenuEl.classList.toggle('active', expanded);
      menuBtn.setAttribute('aria-expanded', expanded);
    });
    navLinksEl.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinksEl.classList.remove('active');
        if (navMenuEl) navMenuEl.classList.remove('active');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Listings Dropdown & Submenu Hover Grace Period ---------- */
  const dropdownItems = document.querySelectorAll('.nav-item-dropdown');
  dropdownItems.forEach((dropdown) => {
    let timeoutId = null;

    const openDropdown = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      dropdown.classList.add('is-open');
      const toggle = dropdown.querySelector('.dropdown-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
    };

    const closeDropdown = () => {
      timeoutId = setTimeout(() => {
        dropdown.classList.remove('is-open');
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }, 250);
    };

    dropdown.addEventListener('mouseenter', openDropdown);
    dropdown.addEventListener('mouseleave', closeDropdown);

    dropdown.addEventListener('focusin', openDropdown);
    dropdown.addEventListener('focusout', (e) => {
      if (!dropdown.contains(e.relatedTarget)) {
        dropdown.classList.remove('is-open');
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    });

    const subDropdowns = dropdown.querySelectorAll('.dropdown-item-has-sub');
    subDropdowns.forEach((sub) => {
      let subTimeoutId = null;

      const openSub = () => {
        if (subTimeoutId) {
          clearTimeout(subTimeoutId);
          subTimeoutId = null;
        }
        sub.classList.add('is-open');
      };

      const closeSub = () => {
        subTimeoutId = setTimeout(() => {
          sub.classList.remove('is-open');
        }, 220);
      };

      sub.addEventListener('mouseenter', openSub);
      sub.addEventListener('mouseleave', closeSub);
      sub.addEventListener('focusin', openSub);
      sub.addEventListener('focusout', (e) => {
        if (!sub.contains(e.relatedTarget)) {
          sub.classList.remove('is-open');
        }
      });
    });
  });

  /* ---------- Navbar: visible on Home, hidden elsewhere ---------- */
  const navbar = document.querySelector('.navbar');
  const homeSection = document.querySelector('#home');

  if (navbar && homeSection) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          navbar.classList.toggle('nav-hidden', !entry.isIntersecting);
        });
      },
      { threshold: 0.15 }
    );
    navObserver.observe(homeSection);
  }

  /* ---------- Scroll-reveal animations ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  /* ---------- Highlight active nav link while scrolling ---------- */
  const sections = document.querySelectorAll('section[id], header[id]');
  const navAnchors = document.querySelectorAll('.nav-links > li > a[href^="#"]:not(.dropdown-toggle)');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navAnchors.forEach((a) => a.classList.remove('active'));
          const match = document.querySelector(`.nav-links > li > a[href="#${entry.target.id}"]`);
          if (match) match.classList.add('active');
        }
      });
    },
    { threshold: 0.5 }
  );
  sections.forEach((sec) => sectionObserver.observe(sec));

  /* ---------- Scroll progress bar ---------- */
  const progressBar = document.querySelector('.scroll-progress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = `${(scrollTop / docHeight) * 100}%`;
    });
  }

  /* ---------- Subtle hero parallax ---------- */
  const heroVideo = document.querySelector('.hero-video');
  const heroContainer = document.querySelector('.hero > .container');
  if (heroVideo && heroContainer) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (scrollY < window.innerHeight) {
        heroVideo.style.transform = `translateY(${scrollY * 0.3}px) scale(1.05)`;
        heroContainer.style.transform = `translateY(${scrollY * 0.2}px)`;
        heroContainer.style.opacity = Math.max(1 - scrollY / (window.innerHeight * 0.8), 0);
      }
    });
  }

  /* ---------- Contact form → POST /api/contact ---------- */
  const contactForm = document.querySelector('.contact-form');
  const formSuccess = document.querySelector('#form-success');

  if (contactForm && formSuccess) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Collect all form values
      const name     = document.getElementById('name').value.trim();
      const phone    = document.getElementById('phone').value.trim();
      const email    = document.getElementById('email').value.trim();
      const message  = document.getElementById('message').value.trim();
      const interest = contactForm.querySelector('input[name="interest"]:checked')?.value || '';
      const prefs    = [...contactForm.querySelectorAll('input[name="pref"]:checked')]
                         .map(cb => cb.value);

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';
      submitBtn.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/contact`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            phone,
            email,
            message,
            interest,
            contact_preference: prefs.join(', ')
          })
        });

        const data = await res.json();

        if (data.success) {
          formSuccess.style.display = 'block';
          contactForm.reset();
          formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          alert('Something went wrong. Please try again.');
        }
      } catch (err) {
        console.error('[Brickstone] Contact form error:', err);
        // Still show success UX so user isn't left hanging
        formSuccess.style.display = 'block';
        contactForm.reset();
        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  /* ---------- Property Modal (Featured Properties — hardcoded) ---------- */
  const propertiesData = {
    "hillside-villa": {
      badge: "PG",
      image: "images/delhi-gk-pg-room.jpg",
      title: "Aura Luxury PG",
      price: "₹25,000/mo",
      location: "Greater Kailash, New Delhi",
      specs: ["1 Bed", "1 Bath", "450 sqft"],
      description: "An upscale, fully furnished executive PG suite in Greater Kailash, South Delhi. Featuring bespoke walnut wood furnishings, private en-suite bathroom, high-speed fiber internet, daily housekeeping, and quiet ambient lighting designed for discerning professionals."
    },
    "skyline-penthouse": {
      badge: "PG",
      image: "images/delhi-ivy-pg-room.jpg",
      title: "The Ivy House PG",
      price: "₹22,000/mo",
      location: "Hauz Khas, New Delhi",
      specs: ["1 Bed", "1 Bath", "400 sqft"],
      description: "A tranquil, boutique PG residence nestled in Hauz Khas, South Delhi. Thoughtfully appointed with bespoke oak furniture, private en-suite bathroom, high-speed WiFi, nutritious chef-prepared meals, daily housekeeping, and lush tree-lined views."
    },
    "coastal-retreat": {
      badge: "For Sale",
      image: "images/delhi-ncr-flat-camellias-street.jpg",
      title: "The Camellias Sky Residence",
      price: "₹12.5 Cr",
      location: "Golf Course Road, Gurugram (NCR)",
      specs: ["4 Beds", "4 Baths", "5,400 sqft"],
      description: "An iconic high-floor residence at The Camellias on Golf Course Road, Gurugram. Featuring soaring double-height ceilings, Statuario marble salons, private wraparound balcony overlooking manicured golf greens, bespoke Italian kitchen, and master bedroom suite with integrated dressing lounge."
    },
    "urban-loft": {
      badge: "For Sale",
      image: "images/delhi-flat-vasant-street.jpg",
      title: "The Vasant Vihar Residence",
      price: "₹8.5 Cr",
      location: "Vasant Vihar, New Delhi",
      specs: ["4 Beds", "4 Baths", "4,200 sqft"],
      description: "A sprawling full-floor luxury residence in Vasant Vihar, South Delhi. Featuring Italian marble living salons, floor-to-ceiling glass wrapping around a landscaped private terrace, bespoke modular kitchen, automated climate control, and four expansive en-suite bedrooms with walk-in dressing suites."
    },
    "garden-bungalow": {
      badge: "For Sale",
      image: "images/delhi-flat-golflinks-street.jpg",
      title: "The Golf Links Manor",
      price: "₹6.2 Cr",
      location: "Golf Links, New Delhi",
      specs: ["3 Beds", "3 Baths", "2,800 sqft"],
      description: "An architectural masterpiece in Golf Links, New Delhi. Featuring high ceilings, sun-bathed open-concept living and dining areas, designer smoked oak finishes, private elevator access, and serene leafy views in one of the capital's most prestigious enclaves."
    },
    "heritage-townhouse": {
      badge: "PG",
      image: "images/delhi-arbour-twin-room.jpg",
      title: "The Arbour Executive PG",
      price: "₹26,000/mo",
      location: "DLF Cyber City, Gurugram (NCR)",
      specs: ["Twin Sharing", "1 Bath", "420 sqft"],
      description: "A premier executive twin sharing PG studio suite situated adjacent to DLF Cyber City, Gurugram. Designed for corporate professionals, featuring dedicated ergonomic work pods, high-speed leased line internet, housekeeping, healthy meal plans, and exclusive resident terrace lounge access."
    },
    "skyline-penthouse-mumbai": {
      badge: "For Sale",
      image: "images/business.jpg",
      title: "Skyline Penthouse",
      price: "₹3.5 Cr",
      location: "Bandra West, Mumbai",
      specs: ["4 Beds", "3 Baths", "2,800 sq.ft"],
      description: "A refined penthouse in the heart of Bandra West, with floor-to-ceiling glass, panoramic city and sea-facing views, and a private terrace built for entertaining."
    },
    "heritage-row-villa": {
      badge: "For Rent",
      image: "images/villa.jpg",
      title: "Heritage Row Villa",
      price: "₹85,000/mo",
      location: "Koregaon Park, Pune",
      specs: ["5 Beds", "4 Baths", "4,200 sqft"],
      description: "A spacious heritage-style villa in one of Pune's most sought-after neighbourhoods, featuring a private pool, landscaped garden, and generous entertaining spaces indoors and out."
    },
    "metro-business-hub": {
      badge: "For Lease",
      image: "images/business.jpg",
      title: "Metro Business Hub",
      price: "₹1.2 Cr",
      location: "BKC, Mumbai",
      specs: ["2 Baths", "3,500 sq.ft"],
      description: "A premium commercial space in Mumbai's BKC business district, with a striking glass facade, column-free floor plates, and flexible layout options for corporate offices."
    }
  };

  const modalOverlay   = document.querySelector('#property-modal');
  const modalCloseBtn  = document.querySelector('#modal-close-btn');
  const panelDetails   = document.querySelector('#modal-panel-details');
  const panelForm      = document.querySelector('#modal-panel-form');
  const enquireBtn     = document.querySelector('#enquire-btn');
  const backToDetailsBtn = document.querySelector('#back-to-details');
  const enquiryForm    = document.querySelector('#enquiry-form');
  const enquirySuccess = document.querySelector('#enquiry-success');

  // Track which property is open so we can include it in the enquiry
  let activePropertyKey = null;

  function formatSpecWithIcon(specText) {
    const textLower = specText.toLowerCase();
    let iconSvg = '';
    if (textLower.includes('bed') || textLower.includes('bhk')) {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; opacity:0.7;"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`;
    } else if (textLower.includes('bath')) {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; opacity:0.7;"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><line x1="10" x2="8" y1="5" y2="7"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="7" x2="7" y1="19" y2="21"/><line x1="17" x2="17" y1="19" y2="21"/></svg>`;
    } else if (textLower.includes('sq')) {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; opacity:0.7;"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
    }
    return `<span style="display:inline-flex; align-items:center; font-size:0.85rem; color:inherit;">${iconSvg}${specText}</span>`;
}

  function openModal(propertyId) {
    const data = propertiesData[propertyId];
    if (!data) return;
    activePropertyKey = propertyId;

    document.querySelector('#modal-badge').textContent = data.badge;
    document.querySelector('#modal-img').src = data.image;
    document.querySelector('#modal-img').alt = data.title;
    document.querySelector('#modal-title').textContent = data.title;
    document.querySelector('#modal-price').textContent = data.price;
    document.querySelector('#modal-location').innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; opacity:0.7;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${data.location}
    `;
    document.querySelector('#modal-description').textContent = data.description;
    document.querySelector('#enquire-property-name').textContent = data.title;

    const specsContainer = document.querySelector('#modal-specs');
    specsContainer.innerHTML = data.specs.map(spec => formatSpecWithIcon(spec)).join('');

    // Always reset to the details screen when opening
    panelDetails.style.display = 'block';
    panelForm.style.display = 'none';
    enquirySuccess.style.display = 'none';
    enquiryForm.style.display = 'block';
    enquiryForm.reset();

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    activePropertyKey = null;
  }

  document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.property));
  });

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

  // Click outside the box closes it
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // Escape key closes it
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
    });
  }

  // Switch to enquiry form
  if (enquireBtn && panelDetails && panelForm) {
    enquireBtn.addEventListener('click', () => {
      panelDetails.style.display = 'none';
      panelForm.style.display = 'block';
    });
  }

  // Back to details
  if (backToDetailsBtn && panelDetails && panelForm) {
    backToDetailsBtn.addEventListener('click', () => {
      panelForm.style.display = 'none';
      panelDetails.style.display = 'block';
    });
  }

  /* ---------- Featured Properties Enquiry form → POST /api/enquiries ---------- */
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!activePropertyKey) {
          alert('Error: No property selected for enquiry.');
          return;
      }

      const phone = document.getElementById('enquire-phone').value.trim();
      const email = document.getElementById('enquire-email').value.trim();
      const propData = propertiesData[activePropertyKey] || {};

      const submitBtn = enquiryForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';
      submitBtn.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/enquiries`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_id:    activePropertyKey,
            property_title: propData.title || activePropertyKey,
            phone,
            email
          })
        });
        
        if (!res.ok) throw new Error('API Error');

        enquiryForm.style.display = 'none';
        enquirySuccess.style.display = 'block';
      } catch (err) {
        console.error('[Brickstone] Enquiry submission error:', err);
        alert('Failed to send enquiry. Please try again.');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  /* ---------- Frontend Analytics Tracking ---------- */
  function trackEvent(eventType, propertyId = null, metadata = null) {
    // Generate or get session ID
    let sessionId = sessionStorage.getItem('brickstone_session');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      sessionStorage.setItem('brickstone_session', sessionId);
    }
    
    // Detect basic device type
    let deviceType = 'desktop';
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(navigator.userAgent)) {
      deviceType = 'tablet';
    }

    fetch(`${API_BASE}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        page: window.location.pathname,
        property_id: propertyId,
        session_id: sessionId,
        device_type: deviceType,
        referrer: document.referrer,
        metadata: metadata
      })
    }).catch(e => console.error('Analytics error:', e)); // Silently fail
  }

  // Track initial page view
  trackEvent('page_view');

  // Track enquiry submit
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', () => {
      trackEvent('enquiry_submit', activePropertyKey);
    });
  }
  
  // Track contact submit
  if (contactForm) {
    contactForm.addEventListener('submit', () => {
      trackEvent('contact_submit');
    });
  }

  /* ==========================================================================
     UNIVERSAL SEARCH COMPONENT
     ========================================================================== */
  const searchContainers = document.querySelectorAll('.universal-search-container');
  const searchTrigger = document.getElementById('nav-search-btn');
  const searchPanel = document.getElementById('nav-search-panel');

  if (searchContainers.length > 0) {
    let searchableData = [];
    let isDataLoaded = false;

    // Static pages/categories to always include in search
    const staticData = [
      { id: 'page-home', type: 'page', title: 'Home', subtitle: 'Brickstone Real Estate', url: 'index.html#home', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>' },
      { id: 'page-about', type: 'page', title: 'About Us', subtitle: 'Learn more about Brickstone', url: 'index.html#about', icon: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>' },
      { id: 'page-contact', type: 'page', title: 'Contact Us', subtitle: 'Get in touch with our team', url: 'index.html#contact', icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>' },
      { id: 'cat-properties', type: 'category', title: 'Listings - All Properties', subtitle: 'View our curated collection', url: 'allproperties.html', icon: '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>' },
      { id: 'cat-pg', type: 'category', title: 'PG Accommodations', subtitle: 'Sharing & Non-Sharing PG', url: 'allproperties.html?category=PG', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>' },
      { id: 'cat-flat', type: 'category', title: 'Flats & Apartments', subtitle: 'Residential Flats (1, 2, 3 BHK+)', url: 'allproperties.html?category=Flat', icon: '<path d="M3 21h18"></path><path d="M9 8h1"></path><path d="M9 12h1"></path><path d="M9 16h1"></path><path d="M14 8h1"></path><path d="M14 12h1"></path><path d="M14 16h1"></path><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>' }
    ];

    const getPropertyUrl = (propertyId) => {
      return `allproperties.html?id=${propertyId}`;
    };

    // Load dynamic data from API
    const loadSearchData = async () => {
      if (isDataLoaded) return;
      try {
        const res = await fetch(`${API_BASE}/properties`);
        const data = await res.json();
        
        const resolveImageUrl = (url) => {
          if (!url || typeof url !== 'string') return url;
          const base = window.ENV?.BASE_URL || 'http://localhost:5000';
          if (url.includes('brickstone-real-estate-m8w1.onrender.com/uploads/')) {
              return base + url.split('.com')[1];
          }
          if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
              return base + (url.startsWith('/') ? url : '/' + url);
          }
          return url;
        };

        const apiProperties = data.success ? data.data.map(p => ({
          id: p.id,
          type: 'property',
          title: p.title,
          subtitle: `${p.location} • ${p.price}`,
          status: p.badge || p.status,
          image: resolveImageUrl(p.image),
          url: getPropertyUrl(p.id),
          searchString: `${p.title} ${p.location} ${p.description} ${p.price} ${p.specs ? p.specs.join(' ') : ''}`.toLowerCase()
        })) : [];
        
        const localProperties = Object.keys(propertiesData).map(k => {
          const p = propertiesData[k];
          return {
            id: k,
            type: 'property',
            title: p.title,
            subtitle: `${p.location} • ${p.price}`,
            status: p.badge,
            image: resolveImageUrl(p.image),
            url: getPropertyUrl(k),
            searchString: `${p.title} ${p.location} ${p.description} ${p.price} ${p.specs.join(' ')}`.toLowerCase(),
            isLocal: true
          };
        });

        const mergedProps = [...apiProperties];
        localProperties.forEach(lp => {
          if (!mergedProps.some(ap => ap.title === lp.title)) {
            mergedProps.push(lp);
          }
        });

        searchableData = [...staticData, ...mergedProps];
        isDataLoaded = true;
      } catch (err) {
        searchableData = [...staticData, ...Object.keys(propertiesData).map(k => {
          const p = propertiesData[k];
          return {
            id: k, type: 'property', title: p.title, subtitle: `${p.location} • ${p.price}`, status: p.badge, image: resolveImageUrl(p.image), url: getPropertyUrl(k), searchString: `${p.title} ${p.location} ${p.description} ${p.price} ${p.specs.join(' ')}`.toLowerCase(), isLocal: true
          };
        })];
        isDataLoaded = true;
      }
    };

    searchContainers.forEach(container => {
      const searchInput = container.querySelector('input[type="text"]');
      const searchBar = container.querySelector('.universal-search-bar');
      const resultsDropdown = container.querySelector('.search-results-dropdown');
      const resultsContent = container.querySelector('.search-results-content');
      const clearBtn = container.querySelector('.search-clear-btn');
      const hintKey = container.querySelector('.keyboard-hints, #search-shortcut-hint');

      if (!searchInput || !resultsDropdown || !resultsContent) return;

      let selectedIndex = -1;
      let searchDebounceTimer = null;
      let currentResults = [];

      const closeSearch = () => {
        resultsDropdown.style.display = 'none';
        if (searchBar) searchBar.classList.remove('focused');
        if (searchPanel && container.closest('#nav-search-panel')) {
          searchPanel.classList.remove('active');
        }
        selectedIndex = -1;
      };

      searchInput.addEventListener('focus', () => {
        if (searchPanel && container.closest('#nav-search-panel')) {
          searchPanel.classList.add('active');
        }
        if (searchBar) searchBar.classList.add('focused');
        if (hintKey) hintKey.style.display = 'none';
        if (!isDataLoaded) loadSearchData();
        if (searchInput.value.trim().length > 0) performSearch(searchInput.value);
      });

      document.addEventListener('click', (e) => {
        if (!container.contains(e.target) && (!searchTrigger || !searchTrigger.contains(e.target))) {
          closeSearch();
          if (hintKey) hintKey.style.display = 'block';
        }
      });

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          searchInput.value = '';
          clearBtn.style.display = 'none';
          searchInput.focus();
          resultsDropdown.style.display = 'none';
        });
      }

      searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (clearBtn) clearBtn.style.display = val.length > 0 ? 'flex' : 'none';
        
        clearTimeout(searchDebounceTimer);
        if (val.trim().length === 0) {
          resultsDropdown.style.display = 'none';
          return;
        }
        
        if (!isDataLoaded) {
          resultsDropdown.style.display = 'flex';
          resultsContent.innerHTML = '<div class="search-loading">Searching...</div>';
        }
        
        searchDebounceTimer = setTimeout(() => {
          performSearch(val);
        }, 250);
      });

      const performSearch = async (query) => {
        if (!isDataLoaded) await loadSearchData();
        
        const q = query.toLowerCase().trim();
        if (!q) return;

        if (typeof trackEvent === 'function') trackEvent('search_query', null, { query: q });

        let results = [];
        const exactMatches = [];
        const partialMatches = [];

        searchableData.forEach(item => {
          let score = 0;
          const itemStr = item.searchString ? item.searchString : `${item.title} ${item.subtitle}`.toLowerCase();
          
          if (item.title.toLowerCase() === q) score += 100;
          else if (item.title.toLowerCase().startsWith(q)) score += 50;
          else if (item.title.toLowerCase().includes(q)) score += 20;
          
          if (item.subtitle.toLowerCase().includes(q)) score += 10;
          if (item.searchString && item.searchString.includes(q)) score += 5;

          if (score > 0) {
            if (score >= 50) exactMatches.push({...item, score});
            else partialMatches.push({...item, score});
          }
        });

        exactMatches.sort((a,b) => b.score - a.score);
        partialMatches.sort((a,b) => b.score - a.score);
        results = [...exactMatches, ...partialMatches].slice(0, 8);
        
        currentResults = results;
        renderResults(results, query);
      };

      const renderResults = (results, query) => {
        resultsDropdown.style.display = 'flex';
        selectedIndex = -1;
        
        if (results.length === 0) {
          resultsContent.innerHTML = `
            <div class="search-empty-state">
              <div class="empty-title">No results found for "${query}"</div>
              <p>Try a different property name, location or category.</p>
            </div>
          `;
          if (typeof trackEvent === 'function') trackEvent('search_no_results', null, { query });
          return;
        }

        let html = '';
        const grouped = { property: [], category: [], page: [] };
        results.forEach(r => grouped[r.type].push(r));

        if (grouped.property.length > 0) {
          html += '<div class="search-section-title">Properties</div>';
          grouped.property.forEach((p, i) => html += createResultItem(p, results.indexOf(p)));
        }
        
        if (grouped.category.length > 0) {
          html += '<div class="search-section-title">Categories</div>';
          grouped.category.forEach((c, i) => html += createResultItem(c, results.indexOf(c)));
        }
        
        if (grouped.page.length > 0) {
          html += '<div class="search-section-title">Pages</div>';
          grouped.page.forEach((p, i) => html += createResultItem(p, results.indexOf(p)));
        }

        resultsContent.innerHTML = html;
        
        const resultEls = resultsContent.querySelectorAll('.search-result-item');
        resultEls.forEach((el, index) => {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            handleResultSelection(index);
          });
          el.addEventListener('mouseenter', () => updateSelection(index));
        });
      };

      const createResultItem = (item, index) => {
        const media = item.type === 'property' 
          ? `<img src="${item.image}" alt="${item.title}" class="result-thumb">`
          : `<div class="result-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg></div>`;
          
        const statusBadge = item.status ? `<span class="result-status">${item.status}</span>` : '';
        
        return `
          <a href="${item.url}" class="search-result-item" data-index="${index}">
            ${media}
            <div class="result-info">
              <div class="result-title">${item.title}</div>
              <div class="result-subtitle">${item.subtitle}</div>
            </div>
            ${statusBadge}
          </a>
        `;
      };

      const updateSelection = (index) => {
        const items = resultsContent.querySelectorAll('.search-result-item');
        items.forEach(el => el.classList.remove('selected'));
        
        if (index >= 0 && index < currentResults.length) {
          selectedIndex = index;
          if (items[index]) {
            items[index].classList.add('selected');
            items[index].scrollIntoView({ block: 'nearest' });
          }
        } else {
          selectedIndex = -1;
        }
      };

      const handleResultSelection = (index) => {
        if (index >= 0 && index < currentResults.length) {
          const item = currentResults[index];
          if (typeof trackEvent === 'function') trackEvent('search_result_click', item.id, { title: item.title });
          
          closeSearch();
          
          if (item.url.startsWith('#')) {
            const target = document.querySelector(item.url);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
              history.pushState(null, null, item.url);
            } else {
              window.location.href = `index.html${item.url}`;
            }
          } else {
            window.location.href = item.url;
          }
        }
      };

      searchInput.addEventListener('keydown', (e) => {
        if (resultsDropdown.style.display === 'none' && e.key === 'Enter') {
          if (searchInput.value.trim().length > 0) {
            e.preventDefault();
            setTimeout(() => {
              if (currentResults.length > 0) handleResultSelection(0);
            }, 100);
          }
          return;
        }

        if (resultsDropdown.style.display !== 'none') {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            updateSelection(selectedIndex < currentResults.length - 1 ? selectedIndex + 1 : 0);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            updateSelection(selectedIndex > 0 ? selectedIndex - 1 : currentResults.length - 1);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0) {
              handleResultSelection(selectedIndex);
            } else if (currentResults.length > 0) {
              handleResultSelection(0);
            } else {
              window.location.href = `allproperties.html?q=${encodeURIComponent(searchInput.value)}`;
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            closeSearch();
          }
        }
      });
    });

    if (searchTrigger) {
      searchTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (searchPanel) {
          const isOpen = searchPanel.classList.toggle('active');
          if (isOpen) {
            const panelInput = searchPanel.querySelector('input[type="text"]');
            if (panelInput) panelInput.focus();
          }
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (searchPanel) {
          searchPanel.classList.add('active');
          const panelInput = searchPanel.querySelector('input[type="text"]');
          if (panelInput) panelInput.focus();
        }
      }
    });
  }

  // ---------- Load About Section ----------
  async function loadPublicAbout() {
    try {
      const res = await fetch(`${API_BASE}/site/about`);
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if(d.heading) {
          const el = document.getElementById('public-about-heading');
          if(el) el.textContent = d.heading;
        }
        if(d.subheading) {
          const el = document.getElementById('public-about-subheading');
          if(el) el.textContent = d.subheading;
        }
        if(d.description) {
          const el = document.getElementById('public-about-description');
          if(el) el.textContent = d.description;
        }
        if(d.closing_line) {
          const el = document.getElementById('public-about-closing');
          if(el) el.textContent = d.closing_line;
        }
        if(d.image_url) {
          const el = document.getElementById('public-about-image');
          if(el) el.src = d.image_url;
        }
      }
    } catch(e) {
      console.warn("Using default about section content.");
    }
  }
  loadPublicAbout();

});