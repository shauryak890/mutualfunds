const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  register,
  login,
  getMe,
  createSubAgent,
  getPendingAgents,
  approveAgent,
  getAgentHierarchy
} = require('../controllers/auth');
const User = require('../models/User');

// Debug middleware for auth routes
router.use((req, res, next) => {
  console.log('Auth route hit:', {
    method: req.method,
    path: req.path,
    body: req.method === 'POST' ? { ...req.body, password: '[REDACTED]' } : undefined
  });
  next();
});

// Public routes
router.route('/register').post(register);
router.route('/login').post(login);

// Protected routes
router.route('/me').get(protect, getMe);
router.route('/create-sub-agent').post(protect, createSubAgent);
router.route('/pending-agents').get(protect, authorize('admin'), getPendingAgents);
router.route('/agent-hierarchy').get(protect, getAgentHierarchy);
router.route('/approve-agent/:id').put(protect, authorize('admin'), approveAgent);

// Protected admin routes
router.get('/agent-hierarchy', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Fetching agent hierarchy for admin:', req.user.email);
    const agents = await User.find({ role: 'agent' })
      .populate({
        path: 'subAgents',
        select: 'name email agentId isApproved',
        match: { role: 'sub-agent' }
      });

    res.json({
      success: true,
      data: agents.map(agent => ({
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        agentId: agent.agentId,
        subAgents: agent.subAgents
      }))
    });
  } catch (error) {
    console.error('Error fetching agent hierarchy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent hierarchy'
    });
  }
});

// Add this at the top of your routes
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working' });
});

// Add this near your other routes
router.get('/test-auth', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
