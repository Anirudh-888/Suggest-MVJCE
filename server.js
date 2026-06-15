const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'complaints.json');
const ADMIN_PASSCODE = 'admin123';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Read complaints file
async function readComplaints() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, create it with empty array
    if (error.code === 'ENOENT') {
      await writeComplaints([]);
      return [];
    }
    console.error('Error reading complaints:', error);
    throw error;
  }
}

// Helper: Write complaints file
async function writeComplaints(data) {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing complaints:', error);
    throw error;
  }
}

// Middleware: Verify Admin Passcode for protected routes
function verifyAdmin(req, res, next) {
  const passcode = req.headers['x-admin-passcode'];
  if (passcode === ADMIN_PASSCODE) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized access. Invalid admin passcode.' });
  }
}

// Route: Verify admin password
app.post('/api/admin/verify', (req, res) => {
  const { passcode } = req.body;
  if (passcode === ADMIN_PASSCODE) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid passcode' });
  }
});

// Route: Create new complaint (Anonymous)
app.post('/api/complaints', async (req, res) => {
  try {
    const { title, category, subcategory, description } = req.body;

    if (!title || !category || !subcategory || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const complaints = await readComplaints();

    const newComplaint = {
      id: uuidv4(),
      title: title.trim(),
      category: category.trim(),
      subcategory: subcategory.trim(),
      description: description.trim(),
      status: 'Pending',
      votes: 0,
      archived: false,
      timestamp: new Date().toISOString()
    };

    complaints.push(newComplaint);
    await writeComplaints(complaints);

    res.status(201).json(newComplaint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process suggestion' });
  }
});

// Route: Get all complaints
app.get('/api/complaints', async (req, res) => {
  try {
    const complaints = await readComplaints();
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve suggestions' });
  }
});

// Route: Vote for a suggestion
app.post('/api/complaints/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const complaints = await readComplaints();
    const index = complaints.findIndex(c => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    // Increment votes
    complaints[index].votes = (complaints[index].votes || 0) + 1;
    await writeComplaints(complaints);

    res.json({ success: true, votes: complaints[index].votes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Route: Update complaint (Admin protected)
app.patch('/api/complaints/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, archived } = req.body;

    const complaints = await readComplaints();
    const index = complaints.findIndex(c => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    // Update status if provided and valid
    if (status !== undefined) {
      const validStatuses = ['Pending', 'In Progress', 'Resolved'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      complaints[index].status = status;
    }

    // Update archived if provided
    if (archived !== undefined) {
      complaints[index].archived = !!archived;
    }

    await writeComplaints(complaints);
    res.json(complaints[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
