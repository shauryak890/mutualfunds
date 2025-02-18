const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['purchase', 'redemption', 'sip'],
    required: true
  },
  scheme: {
    type: String,
    required: true
  },
  client: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  agentId: {
    type: String,
    ref: 'User',
    required: true
  },
  subAgentId: {
    type: String,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', TransactionSchema); 