const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  // Custom UUID-based ID (preserves compatibility with existing frontend)
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    enum: {
      values: ['Academics', 'Infrastructure', 'Hostel', 'Canteen', 'Sports & Co-curricular', 'Others'],
      message: '{VALUE} is not a valid category'
    }
  },
  subcategory: {
    type: String,
    required: [true, 'Subcategory is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  image: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved'],
    default: 'Pending'
  },
  progressPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  assignedDepartment: {
    type: String,
    default: null,
    trim: true
  },
  votes: {
    type: Number,
    default: 0,
    min: 0
  },
  archived: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  // Use custom 'id' field instead of MongoDB's _id in JSON output
  toJSON: {
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      // Ensure timestamp is ISO string for frontend compatibility
      if (ret.timestamp instanceof Date) {
        ret.timestamp = ret.timestamp.toISOString();
      }
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      if (ret.timestamp instanceof Date) {
        ret.timestamp = ret.timestamp.toISOString();
      }
      return ret;
    }
  }
});

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
