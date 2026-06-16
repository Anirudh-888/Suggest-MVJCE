# SuggestMVJCE

> **Anonymous Suggestion & Complaint Box for MVJ College of Engineering**

A beautiful, macOS-inspired web application that allows students to submit anonymous complaints and suggestions about college infrastructure, academics, hostel, canteen, and more. Administrators can review, track progress, and forward issues to relevant departments.

> **Note to SDC Club Reviewers:**
> For your testing convenience, the passcode to login to the admin dashboard is **`1234`** (this populates the required `X-Admin-Passcode` header).

> **Deployed link to access the website**
> https://suggestmvjce-dubzc6bqgjgwgze6.southeastasia-01.azurewebsites.net/

## Features

| Feature                   | Description                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| **Anonymous Submissions** | Students can submit complaints with title, category, description, and optional photo evidence |
| **Public Board**          | View all active suggestions, upvote issues, and see resolution status                         |
| **Admin Dashboard**       | Manage complaints — update status, set progress, forward to departments, archive              |
| **Upvote System**         | Community-driven prioritization via upvotes                                                   |
| **Image Attachments**     | Photo evidence upload with automatic compression                                              |
| **Search & Filter**       | Filter by category, status, and search by keyword                                             |
| **Analytics**             | Category distribution charts and featured (most-upvoted) issue display                        |
| **Dark/Light Mode**       | Glassmorphic iOS 26-style design with theme toggle                                            |
| **Fully Responsive**      | Works seamlessly on desktop, tablet, and mobile                                               |

---

## Tech Stack

- **Frontend**: HTML5, Tailwind CSS (CDN), Vanilla JavaScript, Lucide Icons
- **Backend**: Node.js, Express.js 5.x
- **Database**: MongoDB (Atlas Free Tier)
- **Security**: Helmet.js, express-rate-limit, CORS, input sanitization
- **Deployment**: Azure App Service (Student tier)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18.0.0
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (free tier) or local MongoDB instance

### 1. Clone the Repository

```bash
git clone https://github.com/Anirudh-888/Suggest-MVJCE.git
cd Suggest-MVJCE

```

### 2. Install Dependencies

```bash
npm install

```

### 3. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your MongoDB connection string
# For Atlas: mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/suggestmvjce

```

### 4. Migrate Existing Data (Optional)

If you have existing data in `data/complaints.json`:

```bash
npm run migrate

```

### 5. Start the Server

```bash
# Development (auto-reload on changes)
npm run dev

# Production
npm start

```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Reference

| Method  | Endpoint                   | Auth  | Description                      |
| ------- | -------------------------- | ----- | -------------------------------- |
| `GET`   | `/api/health`              | —     | Health check (uptime, DB status) |
| `POST`  | `/api/admin/verify`        | —     | Verify admin passcode            |
| `GET`   | `/api/complaints`          | —     | List all complaints              |
| `POST`  | `/api/complaints`          | —     | Create new complaint             |
| `POST`  | `/api/complaints/:id/vote` | —     | Upvote a complaint               |
| `PATCH` | `/api/complaints/:id`      | Admin | Update complaint fields          |

### Creating a Complaint

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Broken Projector in Room 302",
    "category": "Infrastructure",
    "subcategory": "Classrooms",
    "description": "The projector has a flickering display."
  }'

```

### Admin Actions (requires X-Admin-Passcode header)

```bash
curl -X PATCH http://localhost:3000/api/complaints/<id> \
  -H "Content-Type: application/json" \
  -H "X-Admin-Passcode: 1234" \
  -d '{"status": "In Progress", "progressPercent": 50}'

```

---

## Deploying to Azure App Service

### MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free M0 cluster
2. Create a database user with read/write access
3. Whitelist `0.0.0.0/0` in Network Access (allows Azure to connect)
4. Copy your connection string: `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/suggestmvjce`

### Azure App Service Setup

1. Log into the [Azure Portal](https://portal.azure.com) with your student account
2. Create a **Web App**:

- Runtime: **Node 18 LTS** (or Node 20 LTS)
- OS: **Windows** or **Linux**
- Plan: **Free F1** (included with Azure for Students)

3. Go to **Settings → Configuration → Application Settings** and add:

- `MONGODB_URI` = your Atlas connection string
- `ADMIN_PASSCODE` = your desired admin password
- `NODE_ENV` = `production`

4. Go to **Deployment Center** → connect your GitHub repository
5. Azure will automatically deploy on every push to `main`

### Deploy via Azure CLI (Alternative)

```bash
# Login to Azure
az login

# Create and deploy in one command
az webapp up --name suggest-mvjce --runtime "NODE:18-lts" --sku F1

```

---

## Project Structure

```
Suggest-MVJCE/
├── public/               # Frontend static files
│   ├── index.html        # Complaint submission form
│   ├── board.html        # Public suggestion board
│   ├── admin.html        # Admin dashboard
│   └── css/
│       └── style.css     # Custom glassmorphic styles
├── db/
│   ├── connection.js     # MongoDB connection module
│   └── migrate.js        # JSON → MongoDB migration script
├── models/
│   └── Complaint.js      # Mongoose complaint schema
├── uploads/              # Uploaded images (gitignored)
├── data/                 # Legacy JSON storage (gitignored)
├── server.js             # Express.js production server
├── package.json          # Dependencies & scripts
├── web.config            # Azure IISNode configuration
├── .deployment           # Azure deployment config
├── .env.example          # Environment variable template
├── .gitignore            # Git exclusions
└── README.md             # This file

```

---

## Security

- **Helmet.js** — sets secure HTTP headers (CSP, HSTS, etc.)
- **Rate Limiting** — prevents abuse (100 req/15min general, 20 req/15min for writes)
- **Input Sanitization** — strips HTML from user inputs
- **Admin Authentication** — passcode-protected admin routes
- **CORS** — configurable cross-origin access
- **Request Size Limits** — prevents oversized payloads

---

## License

ISC © Anirudh
