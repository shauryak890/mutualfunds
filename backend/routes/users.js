const express = require('express');
const publicRouter = express.Router();
const protectedRouter = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

// Public routes (no auth required)
publicRouter.get('/agents', async (req, res) => {
  console.log('Handling public agents request');
  try {
    const agents = await User.find({ 
      role: 'agent',
      isApproved: true 
    })
    .select('name email agentId _id isApproved')
    .sort({ name: 1 });

    console.log(`Found ${agents.length} approved agents`);
    res.json({ success: true, data: agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agents' });
  }
});

// Add this debug middleware to log all requests to publicRouter
publicRouter.use((req, res, next) => {
  console.log('Public router hit:', {
    method: req.method,
    path: req.path,
    params: req.params
  });
  next();
});

// Verify agent ID endpoint
publicRouter.get('/by-agent-id/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    console.log('Looking up agent with ID:', agentId);
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID is required'
      });
    }

    // Add debug log for the query
    console.log('Searching for agent with query:', {
      agentId: agentId.toUpperCase(),
      role: 'agent',
      isApproved: true
    });

    const agent = await User.findOne({
      agentId: agentId.toUpperCase(),
      role: 'agent',
      isApproved: true
    }).select('_id name agentId');

    console.log('Agent search result:', agent);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'No approved agent found with this ID'
      });
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Error in agent lookup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify agent ID',
      details: error.message
    });
  }
});

// Add a test route to the public router
publicRouter.get('/test', (req, res) => {
  res.json({ message: 'Public router is working' });
});

// Protected routes
protectedRouter.use(protect); // Apply auth middleware to all protected routes

protectedRouter.get('/sub-agents', authorize('agent'), async (req, res) => {
  try {
    const subAgents = await User.find({ 
      parentAgent: req.user.id,
      role: 'sub-agent'
    });
    res.json({ success: true, data: subAgents });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

protectedRouter.put('/:id/approve', authorize('admin'), async (req, res) => {
  try {
    const { isApproved } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isApproved = isApproved;
    await user.save();

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

protectedRouter.post('/register-sub-agent', authorize('agent'), async (req, res) => {
  try {
    const subAgent = await User.create({
      ...req.body,
      role: 'sub-agent',
      parentAgent: req.user.id,
      isApproved: true
    });

    res.status(201).json({ success: true, data: subAgent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = {
  publicRoutes: publicRouter,
  protectedRoutes: protectedRouter
};
