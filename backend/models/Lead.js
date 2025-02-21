const mongoose = require('mongoose');

// Define the schema
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
  customerAddress: {
    type: String,
    required: false
  },
  investmentType: {
    type: String,
    required: [true, 'Please add investment type'],
    enum: ['mutual_funds', 'SIP', 'Lumpsum', 'Both']
  },
  investmentAmount: {
    type: Number,
    required: [true, 'Please add investment amount']
  },
  notes: {
    type: String,
    required: false
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
  }
}, {
  timestamps: true
});

// Debug validation
leadSchema.pre('validate', function(next) {
  console.log('Pre-validation document:', JSON.stringify(this.toObject(), null, 2));
  next();
});

// Export the model
module.exports = mongoose.models.Lead || mongoose.model('Lead', leadSchema); 