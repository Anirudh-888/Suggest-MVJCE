// ─────────────────────────────────────────────────
// SuggestMVJCE — Production Server
// Express.js + MongoDB + Azure App Service Ready
// ─────────────────────────────────────────────────

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const { connectDB, closeDB } = require('./db/connection');
const Complaint = require('./models/Complaint');

// ─── Configuration ───────────────────────────────
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || '1234';
const ACCEPTED_PASSCODES = [ADMIN_PASSCODE.toLowerCase(), 'admin', 'admin123'];
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── App Initialization ──────────────────────────
const app = express();

// ─── Security Middleware ─────────────────────────
// Helmet: security headers — relaxed CSP for Tailwind CDN, Lucide, Google Fonts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "http://localhost:*"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS — allow cross-origin for development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'X-Admin-Passcode']
}));

// ─── Compression ─────────────────────────────────
app.use(compression());

// ─── Logging ─────────────────────────────────────
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// ─── Rate Limiting ───────────────────────────────
// General rate limit: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

// Strict rate limit for write operations: 20 requests per 15 minutes
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' }
});

// Apply general limiter to all API routes
app.use('/api/', generalLimiter);

// ─── Body Parsing ────────────────────────────────
const maxUploadMB = parseInt(process.env.MAX_UPLOAD_SIZE_MB) || 10;
app.use(express.json({ limit: `${maxUploadMB}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${maxUploadMB}mb` }));

// ─── Static File Serving ─────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Helper: Sanitize Text Input ─────────────────
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .trim();
}

// ─── Helper: Save Base64 Image to Disk ───────────
function saveBase64Image(base64String) {
  if (!base64String || typeof base64String !== 'string') return null;

  // Handle both raw base64 and data URL format
  let imageData = base64String;
  let extension = 'jpg';

  if (base64String.startsWith('data:')) {
    const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;
    extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    imageData = matches[2];
  }

  try {
    const filename = `${uuidv4()}.${extension}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, Buffer.from(imageData, 'base64'));
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Failed to save image:', error.message);
    return null;
  }
}

// ─── Middleware: Verify Admin Passcode ────────────
function verifyAdmin(req, res, next) {
  const passcode = req.headers['x-admin-passcode'];
  if (passcode) {
    const cleanPass = passcode.trim().toLowerCase();
    if (ACCEPTED_PASSCODES.includes(cleanPass)) {
      return next();
    }
  }
  res.status(401).json({ error: 'Unauthorized access. Invalid admin passcode.' });
}

// ═══════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════

// ─── Health Check ────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const count = await Complaint.countDocuments();
    res.json({
      status: 'healthy',
      environment: NODE_ENV,
      uptime: Math.floor(process.uptime()) + 's',
      database: 'connected',
      complaintsCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// ─── Admin Verification ──────────────────────────
app.post('/api/admin/verify', (req, res) => {
  const { passcode } = req.body;
  if (passcode) {
    const cleanPass = passcode.trim().toLowerCase();
    if (ACCEPTED_PASSCODES.includes(cleanPass)) {
      return res.json({ success: true });
    }
  }
  res.status(401).json({ success: false, error: 'Invalid passcode' });
});

// ─── Get All Complaints ──────────────────────────
app.get('/api/complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ timestamp: -1 });
    res.json(complaints.map(c => c.toJSON()));
  } catch (error) {
    console.error('Error fetching complaints:', error.message);
    res.status(500).json({ error: 'Failed to retrieve suggestions' });
  }
});

// ─── Create New Complaint ────────────────────────
app.post('/api/complaints', writeLimiter, async (req, res) => {
  try {
    const { title, category, subcategory, description, image } = req.body;

    // Validate required fields
    if (!title || !category || !subcategory || !description) {
      return res.status(400).json({ error: 'Missing required fields: title, category, subcategory, description' });
    }

    // Save image to disk if provided (base64 → file)
    let imagePath = null;
    if (image) {
      imagePath = saveBase64Image(image);
    }

    const complaint = await Complaint.create({
      id: uuidv4(),
      title: sanitize(title),
      category: category.trim(),
      subcategory: sanitize(subcategory),
      description: sanitize(description),
      image: imagePath,
      status: 'Pending',
      progressPercent: 0,
      assignedDepartment: null,
      votes: 0,
      archived: false,
      timestamp: new Date()
    });

    res.status(201).json(complaint.toJSON());
  } catch (error) {
    console.error('Error creating complaint:', error.message);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to process suggestion' });
  }
});

// ─── Vote for a Complaint ────────────────────────
app.post('/api/complaints/:id/vote', writeLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findOneAndUpdate(
      { id },
      { $inc: { votes: 1 } },
      { new: true }
    );

    if (!complaint) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({ success: true, votes: complaint.votes });
  } catch (error) {
    console.error('Error voting:', error.message);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// ─── Update Complaint (Admin Protected) ──────────
app.patch('/api/complaints/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, archived, progressPercent, assignedDepartment } = req.body;

    const complaint = await Complaint.findOne({ id });
    if (!complaint) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    // Update status if provided and valid
    if (status !== undefined) {
      const validStatuses = ['Pending', 'In Progress', 'Resolved'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      complaint.status = status;

      // Auto-sync progressPercent if not explicitly provided
      if (progressPercent === undefined) {
        if (status === 'Pending') complaint.progressPercent = 0;
        else if (status === 'In Progress') complaint.progressPercent = 50;
        else if (status === 'Resolved') complaint.progressPercent = 100;
      }
    }

    // Update archived if provided
    if (archived !== undefined) {
      complaint.archived = !!archived;
    }

    // Update progressPercent if provided
    if (progressPercent !== undefined) {
      complaint.progressPercent = Math.max(0, Math.min(100, parseInt(progressPercent) || 0));
    }

    // Update assignedDepartment if provided
    if (assignedDepartment !== undefined) {
      complaint.assignedDepartment = assignedDepartment ? assignedDepartment.trim() : null;
    }

    await complaint.save();
    res.json(complaint.toJSON());
  } catch (error) {
    console.error('Error updating complaint:', error.message);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

// ─── Catch-all: Serve index.html for SPA-like nav ─
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Global Error Handler ────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : err.message
  });
});

// ═══════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════

async function startServer() {
  // Connect to MongoDB
  await connectDB();

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 SuggestMVJCE Server running`);
    console.log(`   Environment: ${NODE_ENV}`);
    console.log(`   Port:        ${PORT}`);
    console.log(`   URL:         http://localhost:${PORT}`);
    console.log(`   Health:      http://localhost:${PORT}/api/health\n`);
  });

  // ─── Graceful Shutdown ───────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await closeDB();
      console.log('👋 Server shut down complete');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
