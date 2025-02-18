const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Please add customer name']
  },
  customerPhone: {
    type: String,
    required: [true, 'Please add customer phone']
  },
  customerEmail: {
    type: String,
    required: [true, 'Please add customer email']
  },
  customerPAN: {
    type: String,
    required: [true, 'Please add customer PAN']
  },
  investmentType: {
    type: String,
    required: [true, 'Please add investment type'],
    enum: ['mutual_funds', 'SIP', 'Lumpsum', 'Both'],
    default: 'mutual_funds'
  },
  investmentAmount: {
    type: Number,
    required: [true, 'Please add investment amount']
  },
  scheme: {
    type: String,
    required: [true, 'Please add scheme name'],
    default: 'Default Mutual Fund Scheme'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
leadSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add a method to update status without validation
leadSchema.statics.updateStatus = async function(leadId, status) {
  return this.findByIdAndUpdate(
    leadId,
    { 
      status,
      updatedAt: Date.now()
    },
    { 
      new: true,
      runValidators: false // Skip validation when updating status
    }
  );
};

module.exports = mongoose.model('Lead', leadSchema);
