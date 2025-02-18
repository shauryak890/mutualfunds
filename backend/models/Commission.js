const mongoose = require('mongoose');

const CommissionSchema = new mongoose.Schema({
  agentId: {
    type: String,
    required: true,
    ref: 'User'
  },
  subAgentId: {
    type: String,
    ref: 'User'
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  rate: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  paidAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Commission', CommissionSchema); 