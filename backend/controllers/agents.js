const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all sub-agents for an agent
// @route   GET /api/agents/sub-agents
// @access  Private/Agent
exports.getSubAgents = asyncHandler(async (req, res, next) => {
  const subAgents = await User.find({
    parentAgent: req.user._id,
    role: 'sub-agent'
  }).select('name email phone address agentId isApproved createdAt');

  res.status(200).json({
    success: true,
    count: subAgents.length,
    data: subAgents
  });
});

// @desc    Get agent stats
// @route   GET /api/agents/stats
// @access  Private/Agent
exports.getAgentStats = asyncHandler(async (req, res, next) => {
  const stats = {
    totalSubAgents: await User.countDocuments({
      parentAgent: req.user._id,
      role: 'sub-agent'
    }),
    activeSubAgents: await User.countDocuments({
      parentAgent: req.user._id,
      role: 'sub-agent',
      isApproved: true,
      isActive: true
    }),
    // Add more stats as needed
  };

  res.status(200).json({
    success: true,
    data: stats
  });
}); 