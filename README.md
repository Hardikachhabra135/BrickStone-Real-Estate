<div align="center">

# 🏛️ BRICKSTONE
### *Curated Properties. Timeless Value.*

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://html.spec.whatwg.org/)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://www.w3.org/Style/CSS/)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

<br/>

> **BrickStone** is a full-stack premium real estate platform for Delhi & NCR, offering curated luxury PG accommodations and high-end residential flats — combining an editorial aesthetic with a powerful, production-ready Node.js backend.

<br/>

[🌐 Live Demo](https://brickstone-real-estate-m8w1.onrender.com) · [📋 Report Bug](https://github.com/Hardikachhabra135/BrickStone-Real-Estate/issues) · [💡 Request Feature](https://github.com/Hardikachhabra135/BrickStone-Real-Estate/issues)

---

</div>

<br/>

## 📖 Table of Contents

- [✨ About the Project](#-about-the-project)
- [🗺️ System Architecture](#️-system-architecture)
- [🧭 User Journey](#-user-journey)
- [📡 Data Flow](#-data-flow)
- [🗂️ Project Structure](#️-project-structure)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏠 Property Categories](#-property-categories)
- [📦 Featured Listings](#-featured-listings)
- [📡 API Reference](#-api-reference)
- [⚙️ Getting Started](#️-getting-started)
- [🚀 Deployment](#-deployment)
- [🔐 Environment Variables](#-environment-variables)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ About the Project

BrickStone is not just a property listing site — it's a **luxury real estate experience platform** purpose-built for the discerning Delhi & NCR market. Every pixel, every property card, every backend route is designed to reflect one truth: *premium matters*.

### 🌟 Core Highlights

| Feature | Description |
|---|---|
| 🎬 **Cinematic Hero** | Full-viewport looping video background with glassmorphism overlay |
| 🏘️ **6 Featured Listings** | Hand-curated premium PGs & flats with multi-image galleries |
| 🔍 **Smart Search** | Real-time universal search across all property listings |
| 🏷️ **Category Filters** | One-click filter by PG / Flat / BHK / Sharing type |
| 🖼️ **Lightbox Gallery** | Per-property 3-image carousel with full-screen lightbox |
| 📬 **Enquiry System** | Backend-persisted enquiry & contact form pipeline |
| 🔒 **Auth System** | JWT-based admin authentication with role guards |
| 📊 **Analytics Routes** | Built-in analytics event tracking for property views |
| 👤 **Admin Panel** | Full CRUD management panel for listings |
| 🎓 **Intern Portal** | Dedicated workflow portal for interns |
| 📱 **Fully Responsive** | Mobile-first hamburger nav + adaptive grid layout |
| ☁️ **Cloud Deployed** | One-click Render.com deployment via `render.yaml` |

---

## 🗺️ System Architecture

```mermaid
flowchart TD
    subgraph CLIENT["🌐 Client Layer"]
        A["🏠 index.html\nHomepage"]
        B["🏘️ allproperties.html\nAll Listings"]
        C["ℹ️ about.html"]
        D["📞 contact.html"]
    end

    subgraph STATIC["📁 Static Assets"]
        E["style.css\nGlobal Styles"]
        F["script.js\nFrontend Logic"]
        G["config.js\nAPI URL Config"]
        H["images/\nProperty Photos"]
    end

    subgraph BACKEND_LAYER["⚙️ Backend Layer (Node.js / Express)"]
        I["server.js\nApp Entry Point"]
        J["Auth Middleware\nJWT Guard"]
        
        subgraph ROUTES["Routes"]
            R1["propertyRoutes"]
            R2["authRoutes"]
            R3["contactRoutes"]
            R4["enquiryRoutes"]
            R5["adminRoutes"]
            R6["analyticsRoutes"]
            R7["internRoutes"]
            R8["notificationRoutes"]
            R9["uploadRoutes"]
        end

        subgraph CONTROLLERS["Controllers"]
            C1["propertyController"]
            C2["authController"]
            C3["contactController"]
            C4["enquiryController"]
            C5["adminController"]
            C6["analyticsController"]
            C7["internPortalController"]
        end
    end

    subgraph DATA["💾 Data Layer"]
        DB["PostgreSQL\n(Production)"]
        JSON["properties.json\n(Seed / Fallback)"]
    end

    subgraph PORTALS["🖥️ Internal Panels"]
        AP["Admin Panel"]
        IP["Intern Portal"]
    end

    A & B & C & D --> E & F & G & H
    F -->|"REST API calls\nwindow.ENV.API_URL"| I
    I --> J --> ROUTES
    R1 --> C1 --> DB
    R2 --> C2 --> DB
    R3 --> C3 --> DB
    R4 --> C4 --> DB
    R5 --> C5 --> DB
    R6 --> C6 --> DB
    R7 --> C7 --> DB
    JSON -.->|"seed data"| DB
    AP --> R5
    IP --> R7
```

---

## 🧭 User Journey

```mermaid
flowchart LR
    START(["👤 Visitor Arrives"]) --> HERO["🎬 Hero Section\nVideo Background"]
    HERO --> NAV{"Navigation Choice"}

    NAV -->|"Browse"| FEAT["🏛️ Featured Properties\n6 Curated Cards"]
    NAV -->|"All Listings"| ALL["🏘️ All Properties Page"]
    NAV -->|"About"| ABOUT["ℹ️ About Page"]
    NAV -->|"Contact"| CONTACT["📞 Contact Form"]

    FEAT --> CARD["🖼️ Property Card\n3-Image Gallery"]
    ALL --> FILTER["🔍 Filter by Category\nPG / Flat / BHK"]
    FILTER --> SEARCH["🔎 Search by Name\nor Location"]
    SEARCH --> CARD

    CARD --> MODAL["📋 Property Modal\nFull Details + Enquiry"]
    MODAL --> ENQUIRE["📬 Submit Enquiry\nPOST /api/enquiries"]
    ENQUIRE --> CONFIRM(["✅ Enquiry Confirmed\nBackend Persisted"])

    CONTACT --> SEND["📤 POST /api/contact"]
    SEND --> CONFIRM2(["✅ Message Sent"])

    style START fill:#1a1a1a,color:#d4af37,stroke:#d4af37
    style CONFIRM fill:#1a1a1a,color:#4ade80,stroke:#4ade80
    style CONFIRM2 fill:#1a1a1a,color:#4ade80,stroke:#4ade80
```

---

## 📡 Data Flow

```mermaid
sequenceDiagram
    participant U as 👤 User (Browser)
    participant F as 📄 Frontend JS
    participant CF as ⚙️ config.js
    participant API as 🚀 Express API
    participant MW as 🔒 Auth Middleware
    participant CTRL as 🎛️ Controller
    participant DB as 🗄️ PostgreSQL

    U->>F: Loads allproperties.html
    F->>CF: Reads window.ENV.API_URL
    F->>API: GET /api/properties
    API->>CTRL: propertyController.getAll()
    CTRL->>DB: SELECT * FROM properties
    DB-->>CTRL: Property rows
    CTRL-->>API: JSON response
    API-->>F: 200 OK [ ...properties ]
    F-->>U: Renders property cards

    U->>F: Submits Enquiry Form
    F->>API: POST /api/enquiries { name, phone, message, propertyId }
    API->>MW: Validate request
    MW-->>API: OK
    API->>CTRL: enquiryController.create()
    CTRL->>DB: INSERT INTO enquiries
    DB-->>CTRL: Inserted row
    CTRL-->>API: 201 Created
    API-->>F: { success: true }
    F-->>U: ✅ "Enquiry sent!"
```

---

## 🗂️ Project Structure

```
BrickStone-Real-Estate/
│
├── 📁 FRONTEND/                    # Static website (served on port 3000)
│   ├── index.html                  # Homepage — hero, featured properties
│   ├── allproperties.html          # All listings — search + filter
│   ├── about.html                  # About BrickStone
│   ├── contact.html                # Contact form page
│   ├── style.css                   # Global stylesheet (v=9)
│   ├── script.js                   # All frontend JavaScript
│   ├── config.js                   # window.ENV.API_URL configuration
│   └── images/                     # Property photos (20+ real/AI images)
│       ├── delhi-gk-pg-room.jpg
│       ├── delhi-ivy-pg-room.jpg
│       ├── delhi-flat-golflinks-*.jpg
│       ├── delhi-ncr-flat-camellias-*.jpg
│       └── ...
│
├── 📁 BACKEND/                     # Express.js REST API (port 5000)
│   ├── server.js                   # App entry, middleware, route mounting
│   ├── setup.js                    # DB setup / seeding
│   ├── properties.json             # Property seed data (6 featured + more)
│   ├── interns.json                # Intern data
│   ├── messages.json               # Contact messages store
│   │
│   ├── 📁 config/                  # DB connection config
│   ├── 📁 middleware/              # Auth middleware (JWT verify)
│   │
│   ├── 📁 routes/                  # Express route definitions
│   │   ├── propertyRoutes.js       # GET /api/properties, POST, PUT, DELETE
│   │   ├── auth.js                 # POST /api/auth/login, /register
│   │   ├── contactRoutes.js        # POST /api/contact
│   │   ├── enquiryRoutes.js        # POST /api/enquiries
│   │   ├── adminRoutes.js          # Admin CRUD (protected)
│   │   ├── analyticsRoutes.js      # Event tracking
│   │   ├── internRoutes.js         # Intern management
│   │   ├── notificationRoutes.js   # Notifications
│   │   └── uploadRoutes.js         # Image upload (multer)
│   │
│   └── 📁 controllers/             # Business logic
│       ├── propertyController.js
│       ├── authController.js
│       ├── contactController.js
│       ├── enquiryController.js
│       ├── adminController.js
│       ├── analyticsController.js
│       ├── internPortalController.js
│       ├── notificationController.js
│       └── siteController.js
│
├── 📁 ADMIN_PANEL/                 # Admin dashboard (CRUD for listings)
├── 📁 INTERN_PORTAL/               # Intern workflow portal
│
├── serve_all.js                    # Dev server (frontend :3000 + backend :5000)
├── package.json                    # Root scripts & dependencies
├── render.yaml                     # Render.com deployment config
└── README.md                       # You're reading it ✨
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Role |
|---|---|
| **HTML5** | Semantic structure, SEO-friendly markup |
| **CSS3** | Custom properties, Flexbox, Grid, Glassmorphism, animations |
| **Vanilla JS (ES6+)** | DOM manipulation, IntersectionObserver, fetch API |
| **CSS `backdrop-filter`** | Frosted-glass nav and card overlays |

### Backend
| Technology | Role |
|---|---|
| **Node.js** | JavaScript runtime |
| **Express.js** | REST API framework |
| **JWT** | Stateless admin authentication |
| **Multer** | Multipart image upload handling |
| **PostgreSQL** | Production relational database |
| **JSON files** | Seed data / development fallback |

### DevOps & Tooling
| Tool | Role |
|---|---|
| **Render.com** | Cloud hosting (backend API) |
| **render.yaml** | Infrastructure-as-code deployment |
| **Git / GitHub** | Version control & CI/CD trigger |
| **Windows Credential Manager** | Secure local git auth |

---

## 🏠 Property Categories

```mermaid
flowchart TD
    BS(["🏛️ BrickStone Listings"]) --> PG["🏨 PG\nPaying Guest / Co-Living"]
    BS --> FLAT["🏢 Flat\nResidential Apartments"]

    PG --> PG1["Single Occupancy\nPrivate room, en-suite"]
    PG --> PG2["Twin Sharing\nTwo beds, shared amenities"]
    PG --> PG3["Shared / Hostel\nDorm-style, budget-friendly"]

    FLAT --> F1["1 BHK\nSolo / Couple"]
    FLAT --> F2["2 BHK\nSmall family"]
    FLAT --> F3["3 BHK\nFamily / Professionals"]
    FLAT --> F4["4 BHK+\nUltra-luxury / Investment"]

    style BS fill:#1a1a1a,color:#d4af37,stroke:#d4af37
    style PG fill:#1c1c1c,color:#c0a06a,stroke:#c0a06a
    style FLAT fill:#1c1c1c,color:#c0a06a,stroke:#c0a06a
```

---

## 📦 Featured Listings

| # | Property | Location | Type | Price |
|---|---|---|---|---|
| 1 | **Aura Luxury PG** | Greater Kailash, New Delhi | PG · Single | ₹25,000/mo |
| 2 | **The Ivy House PG** | Hauz Khas, New Delhi | PG · Single | ₹22,000/mo |
| 3 | **The Camellias Sky Residence** | Golf Course Rd, Gurugram | Flat · 4BHK | ₹12.5 Cr |
| 4 | **The Vasant Vihar Residence** | Vasant Vihar, Delhi | Flat · 4BHK | ₹8.5 Cr |
| 5 | **The Golf Links Manor** | Golf Links, Delhi | Flat · 3BHK | ₹6.2 Cr |
| 6 | **The Arbour Executive PG** | DLF Cyber City, Gurugram | PG · Twin | ₹26,000/mo |

---

## 📡 API Reference

Base URL: `https://brickstone-real-estate-m8w1.onrender.com/api`

### Properties

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/properties` | ❌ | Get all property listings |
| `GET` | `/properties/:id` | ❌ | Get single property by ID |
| `POST` | `/properties` | ✅ Admin | Create a new listing |
| `PUT` | `/properties/:id` | ✅ Admin | Update a listing |
| `DELETE` | `/properties/:id` | ✅ Admin | Delete a listing |

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | ❌ | Admin login → returns JWT |
| `POST` | `/auth/register` | ❌ | Register new admin |

### Enquiries & Contact

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/enquiries` | ❌ | Submit property enquiry |
| `GET` | `/enquiries` | ✅ Admin | View all enquiries |
| `POST` | `/contact` | ❌ | Submit contact message |
| `GET` | `/contact` | ✅ Admin | View all messages |

### Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/analytics` | ❌ | Log property view event |
| `GET` | `/analytics` | ✅ Admin | Get analytics summary |

### Image Upload

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/upload` | ✅ Admin | Upload property image (multipart) |

---

## ⚙️ Getting Started

### Prerequisites

- Node.js `v18+`
- npm `v9+`
- PostgreSQL (for production) or JSON fallback (for dev)

### 1. Clone the Repository

```bash
git clone https://github.com/Hardikachhabra135/BrickStone-Real-Estate.git
cd BrickStone-Real-Estate
```

### 2. Install Dependencies

```bash
# Install root (dev server) deps
npm install

# Install backend deps
cd BACKEND && npm install && cd ..
```

### 3. Configure Environment

Create `BACKEND/.env`:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_key_here

# PostgreSQL (optional for local dev)
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=brickstone
DB_PORT=5432
DB_SSL=false

FRONTEND_URL=http://localhost:3000
```

Configure frontend API URL in `FRONTEND/config.js`:

```javascript
window.ENV = {
  API_URL: "http://localhost:5000"   // dev
  // API_URL: "https://brickstone-real-estate-m8w1.onrender.com"  // prod
};
```

### 4. Run the App

```bash
# Start both frontend (port 3000) and backend (port 5000)
npm start
```

Or run them separately:

```bash
# Terminal 1 — Backend
npm run backend

# Terminal 2 — Frontend dev server
node serve_all.js
```

Open [http://localhost:3000](http://localhost:3000) in your browser. 🎉

---

## 🚀 Deployment

BrickStone uses **Render.com** for cloud deployment, driven by the `render.yaml` infrastructure-as-code file.

```mermaid
flowchart LR
    DEV["💻 Local Dev\nlocalhost:3000 + :5000"] -->|"git push origin main"| GH["📦 GitHub\nHardikachhabra135/BrickStone-Real-Estate"]
    GH -->|"Auto-deploy trigger"| RENDER["☁️ Render.com"]
    RENDER --> BUILD["🔨 npm install\n(BACKEND/)"]
    BUILD --> START["🚀 node server.js\nPort 5000"]
    START --> LIVE["🌐 Live API\nbrickstone-real-estate-m8w1.onrender.com"]

    style DEV fill:#1a1a1a,color:#d4af37,stroke:#d4af37
    style LIVE fill:#1a1a1a,color:#4ade80,stroke:#4ade80
```

### Steps to Deploy

1. **Fork** this repository to your GitHub account
2. **Create a new Web Service** on [Render.com](https://render.com) → connect GitHub repo
3. Set **Root Directory** to `BACKEND`
4. Set **Start Command** to `npm start`
5. Add the environment variables listed below
6. Hit **Deploy** — Render picks up `render.yaml` automatically

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | Server port (default: `5000`) |
| `NODE_ENV` | ✅ | `production` or `development` |
| `JWT_SECRET` | ✅ | Secret key for JWT signing |
| `DB_HOST` | ✅ | PostgreSQL host |
| `DB_USER` | ✅ | PostgreSQL username |
| `DB_PASSWORD` | ✅ | PostgreSQL password |
| `DB_NAME` | ✅ | Database name |
| `DB_PORT` | ✅ | PostgreSQL port (default: `5432`) |
| `DB_SSL` | ✅ | Enable SSL (`true` / `false`) |
| `CA_CERT_PATH` | ⚙️ | Path to SSL CA cert (if `DB_SSL=true`) |
| `FRONTEND_URL` | ✅ | CORS allowed origin (`*` for public) |

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place. Any contributions you make are **greatly appreciated**.

```mermaid
flowchart LR
    FORK["🍴 Fork the Repo"] --> BRANCH["🌿 Create Feature Branch\ngit checkout -b feature/AmazingFeature"]
    BRANCH --> CODE["✍️ Make Your Changes"]
    CODE --> COMMIT["💾 Commit\ngit commit -m 'Add AmazingFeature'"]
    COMMIT --> PUSH["📤 Push\ngit push origin feature/AmazingFeature"]
    PUSH --> PR["🔀 Open Pull Request"]
    PR --> REVIEW["👀 Code Review"]
    REVIEW --> MERGE["✅ Merged!"]

    style FORK fill:#1a1a1a,color:#d4af37,stroke:#d4af37
    style MERGE fill:#1a1a1a,color:#4ade80,stroke:#4ade80
```

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Commit Convention

We follow **Conventional Commits**:

| Prefix | When to use |
|---|---|
| `feat:` | A new feature |
| `fix:` | A bug fix |
| `docs:` | Documentation only changes |
| `style:` | Formatting, missing semi-colons, etc |
| `refactor:` | Code change that neither fixes a bug nor adds a feature |
| `chore:` | Build process or auxiliary tool changes |

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">

<br/>

**Built with ❤️ for the Delhi & NCR premium real estate market**

*© 2025 BrickStone Real Estate · Curated Properties. Timeless Value.*

<br/>

[![GitHub stars](https://img.shields.io/github/stars/Hardikachhabra135/BrickStone-Real-Estate?style=social)](https://github.com/Hardikachhabra135/BrickStone-Real-Estate/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Hardikachhabra135/BrickStone-Real-Estate?style=social)](https://github.com/Hardikachhabra135/BrickStone-Real-Estate/network/members)

</div>
