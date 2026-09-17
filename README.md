<div align="center">
  <br>
  <h1 style="border-bottom: none; margin-bottom: 0;">B R I C K S T O N E</h1>
  <p style="font-family: serif; font-size: 1.2rem; font-style: italic; color: #555;">Curated Properties. Timeless Value.</p>

  <p align="center">
    <a href="#overview">Overview</a> •
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#admin-panel">Admin Panel</a> •
    <a href="#getting-started">Getting Started</a>
  </p>
</div>

<br>

<div align="center">
  <img src="https://images.unsplash.com/photo-1613490908676-e1754020c99a?auto=format&fit=crop&w=2000&q=80" alt="Luxury Real Estate Exterior" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
</div>

## ✧ Overview

**BRICKSTONE** is a premium, full-stack luxury real estate operations platform. Designed with a cinematic, editorial aesthetic, it seamlessly blends a stunning public-facing showcase with a powerful, secure internal operations dashboard for property management and analytics.

The platform handles real-time property listings, dynamic content management (CMS), and lead generation, powered by an integrated Node.js/PostgreSQL backend architecture.

---

## ✧ Key Features

### Public Experience
- **Cinematic Presentation:** High-quality looping video hero sections and immersive scroll-triggered animations.
- **Dynamic Property Engine:** Real-time property listings fetched seamlessly from a remote database.
- **Smart Universal Search:** Instantly filter properties, locations, and categories with a bespoke glassmorphic UI.
- **Editorial About CMS:** A beautifully structured "About Brickstone" section that reads like a high-end magazine.
- **Frictionless Lead Capture:** Elegant "Let's Talk" integrated inquiry forms.

### Internal Operations (Admin Panel)
- **Live Traffic Analytics:** Monitor daily pageviews, unique visitors, and top-performing property pages in real time.
- **Content Management System (CMS):** Update the public "About" section imagery and copy instantly without deploying code.
- **Lead Management:** Securely view and process client inquiries directly from the dashboard.
- **Property Management:** (Coming Soon) Seamlessly list new curated properties to the public feed.

<br>

<div align="center">
  <img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=2000&q=80" alt="Luxury Interior Architecture" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
</div>

---

## ✧ Architecture & Tech Stack

BRICKSTONE is built for scale, speed, and elegance.

**Frontend Layer:**
- **Markup & Styling:** HTML5, CSS3 (Custom Variables, Flexbox, CSS Grid, Glassmorphism).
- **Interactivity:** Vanilla ES6 JavaScript (IntersectionObserver, Fetch API).
- **Routing:** Hybrid API routing (directing public traffic and admin traffic intelligently).

**Backend Layer:**
- **Server:** Node.js & Express.js.
- **Database:** PostgreSQL (Hosted on Render/Supabase) for live data persistence.
- **Authentication:** JWT-based secure auth for the Admin Panel.
- **API:** RESTful architecture for decoupled frontend-backend communication.

---

## ✧ Getting Started

To run the Brickstone platform locally:

### 1. Clone the Repository
```bash
git clone https://github.com/iamritikarsh/BRICKSTONE-REAL-ESTATE.git
cd BRICKSTONE-REAL-ESTATE
```

### 2. Start the Backend Server
```bash
cd BACKEND
npm install
npm start
```
*The backend API will run on `http://localhost:5000`.*

### 3. Launch the Frontend
You can use any local web server (like Python's `http.server` or VS Code Live Server) to serve the static frontend.
```bash
# Example using Python
cd ../FRONTEND
python -m http.server 8000
```
*Visit `http://localhost:8000` to view the public site.*

### 4. Launch the Admin Panel
```bash
cd ../ADMIN_PANEL
python -m http.server 8001
```
*Visit `http://localhost:8001` to access the operations dashboard.*

---

<div align="center">
  <p><em>Built with uncompromising attention to detail.</em></p>
  <p>© 2026 Brickstone Real Estate</p>
</div>
