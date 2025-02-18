const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

// Get all agents (admin only)
router.get('/agents', protect, authorize('admin'), async (req, res) => {
  try {
    const agents = await User.find({ 
      role: { $in: ['agent', 'sub-agent'] }
    });
    res.json({ success: true, data: agents });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get agent's sub-agents
router.get('/sub-agents', protect, authorize('agent'), async (req, res) => {
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

// Approve/reject agent (admin only)
router.put('/:id/approve', protect, authorize('admin'), async (req, res) => {
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

// Register sub-agent under an agent
router.post('/register-sub-agent', protect, authorize('agent'), async (req, res) => {
  try {
    const subAgent = await User.create({
      ...req.body,
      role: 'sub-agent',
      parentAgent: req.user.id,
      isApproved: true // Auto-approve sub-agents
    });

    res.status(201).json({ success: true, data: subAgent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
