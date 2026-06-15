/**
 * Migration Script: complaints.json → MongoDB
 * 
 * Run once to migrate existing flat-file data into MongoDB.
 * Usage: node db/migrate.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');

const DATA_FILE = path.join(__dirname, '..', 'data', 'complaints.json');

async function migrate() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/suggestmvjce';
  
  console.log('🔄 Starting migration...');
  console.log(`📁 Source: ${DATA_FILE}`);
  console.log(`🗄️  Target: ${uri}`);

  try {
    // Connect to MongoDB
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Check if data file exists
    if (!fs.existsSync(DATA_FILE)) {
      console.log('⚠️  No complaints.json found. Nothing to migrate.');
      await mongoose.connection.close();
      return;
    }

    // Read existing JSON data
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    const complaints = JSON.parse(rawData);

    if (!Array.isArray(complaints) || complaints.length === 0) {
      console.log('⚠️  complaints.json is empty. Nothing to migrate.');
      await mongoose.connection.close();
      return;
    }

    console.log(`📊 Found ${complaints.length} complaints to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const complaint of complaints) {
      try {
        // Check if already exists (skip duplicates)
        const existing = await Complaint.findOne({ id: complaint.id });
        if (existing) {
          console.log(`  ⏭️  Skipping "${complaint.title}" (already exists)`);
          skipped++;
          continue;
        }

        // Create new document
        await Complaint.create({
          id: complaint.id,
          title: complaint.title,
          category: complaint.category,
          subcategory: complaint.subcategory,
          description: complaint.description,
          image: complaint.image || null,
          status: complaint.status || 'Pending',
          progressPercent: complaint.progressPercent || 0,
          assignedDepartment: complaint.assignedDepartment || null,
          votes: complaint.votes || 0,
          archived: complaint.archived || false,
          timestamp: complaint.timestamp ? new Date(complaint.timestamp) : new Date()
        });

        console.log(`  ✅ Migrated: "${complaint.title}"`);
        migrated++;
      } catch (err) {
        console.error(`  ❌ Failed to migrate "${complaint.title}":`, err.message);
      }
    }

    console.log('\n📋 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped:  ${skipped}`);
    console.log(`   📊 Total:    ${complaints.length}`);
    console.log('\n🎉 Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

migrate();
