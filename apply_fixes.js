const fs = require('fs');
let code = fs.readFileSync('FRONTEND/script.js', 'utf-8');

// 1. Fix Navbar
code = code.replace("navbar.classList.toggle('nav-hidden', !entry.isIntersecting);", "// navbar fixed");

// 2. Fix Contact Form
const contactTarget = `  /* ---------- Contact form demo submit ---------- */
  const contactForm = document.querySelector('.contact-form');
  const formSuccess = document.querySelector('#form-success');
  if (contactForm && formSuccess) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      formSuccess.style.display = 'block';
      contactForm.reset();
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }`;
const contactReplacement = `  /* ---------- Contact form submit to backend ---------- */
  const contactForms = document.querySelectorAll('.contact-form');
  contactForms.forEach(contactForm => {
    const formSuccess = contactForm.parentElement.querySelector('#form-success');
    
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameEl = contactForm.querySelector('#name') || contactForm.querySelector('#fullName');
      const emailEl = contactForm.querySelector('#email');
      const phoneEl = contactForm.querySelector('#phone');
      const messageEl = contactForm.querySelector('#message');
      const data = {
        name: nameEl ? nameEl.value : '',
        email: emailEl ? emailEl.value : '',
        phone: phoneEl ? phoneEl.value : '',
        message: messageEl ? messageEl.value : ''
      };
      
      const checkedRadios = contactForm.querySelectorAll('input[type="radio"]:checked');
      checkedRadios.forEach(radio => {
        if (radio.name) data[radio.name] = radio.value;
      });
      
      const checkedBoxes = contactForm.querySelectorAll('input[type="checkbox"]:checked');
      checkedBoxes.forEach(box => {
        if (box.name) {
          if (!data[box.name]) data[box.name] = [];
          data[box.name].push(box.value);
        }
      });

      try {
        const response = await fetch('http://localhost:5000/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          if (formSuccess) {
            formSuccess.style.display = 'block';
            formSuccess.textContent = "Thank you! We've received your message and will contact you soon.";
            formSuccess.style.color = 'green';
            formSuccess.style.padding = '10px';
            formSuccess.style.marginBottom = '15px';
            formSuccess.style.backgroundColor = '#e6ffe6';
            formSuccess.style.borderRadius = '5px';
            formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          contactForm.reset();
        } else {
          alert('Failed to send message. Please try again later.');
        }
      } catch (err) {
        console.error('Error submitting contact form:', err);
        alert('An error occurred while sending your message.');
      }
    });
  });`;
code = code.replace(contactTarget, contactReplacement);

// 3. Fix Enquiry Form
const enquiryTarget = `  // Submit enquiry (demo \u2014 no backend yet)
  if (enquiryForm) enquiryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    enquiryForm.style.display = 'none';
    enquirySuccess.style.display = 'block';
  });`;
const enquiryReplacement = `  // Submit enquiry to backend (Connected to DB)
  if (enquiryForm) enquiryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      property_id: document.querySelector('#enquire-property-name').textContent || 'unknown',
      property_title: document.querySelector('#enquire-property-name').textContent || 'unknown',
      phone: document.querySelector('#enquire-phone').value,
      email: document.querySelector('#enquire-email').value,
    };
    try {
      const response = await fetch('http://localhost:5000/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        enquiryForm.style.display = 'none';
        enquirySuccess.style.display = 'block';
      }
    } catch (err) {
      console.error('Error submitting enquiry form:', err);
    }
  });`;
code = code.replace(enquiryTarget, enquiryReplacement);

fs.writeFileSync('FRONTEND/script.js', code);
