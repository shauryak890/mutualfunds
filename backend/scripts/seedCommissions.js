require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Commission = require('../models/Commission');
const User = require('../models/User');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get an agent
    const agent = await User.findOne({ role: 'agent' });
    if (!agent) {
      console.log('No agent found');
      return;
    }

    // Create a test transaction
    const transaction = await Transaction.create({
      type: 'purchase',
      scheme: 'Test Mutual Fund',
      client: 'Test Client',
      amount: 10000,
      agentId: agent.agentId,
      status: 'completed'
    });

    // Create a commission record
    await Commission.create({
      agentId: agent.agentId,
      transaction: transaction._id,
      amount: 200,
      rate: 2,
      status: 'pending'
    });

    console.log('Test data created successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
  }
};

seedData(); 