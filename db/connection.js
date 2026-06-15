const mongoose = require('mongoose');

/**
 * Connect to MongoDB with retry logic.
 * Uses MONGODB_URI from environment variables.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/suggestmvjce';

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Retry after 5 seconds
    console.log('⏳ Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
}

// Connection event handlers
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

/**
 * Gracefully close the MongoDB connection.
 */
async function closeDB() {
  try {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error.message);
  }
}

module.exports = { connectDB, closeDB };
