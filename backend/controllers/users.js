const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all agents
// @route   GET /api/users/agents
// @access  Public
exports.getAgents = asyncHandler(async (req, res, next) => {
  const agents = await User.find({
    role: 'agent',
    isApproved: true
  })
  .select('name email agentId _id')
  .sort({ name: 1 }); // Sort by name

  // Log the agents being sent
  console.log('Sending agents:', agents.map(a => ({
    name: a.name,
    agentId: a.agentId
  })));

  res.status(200).json({
    success: true,
    data: agents
  });
});

// @desc    Get sub-agents for an agent
// @route   GET /api/users/sub-agents
// @access  Private/Agent
exports.getSubAgents = asyncHandler(async (req, res, next) => {
  const subAgents = await User.find({ 
    parentAgent: req.user.id,
    role: 'sub-agent'
  }).select('-password');

  res.status(200).json({
    success: true,
    data: subAgents
  });
});

// @desc    Approve/Reject agent
// @route   PUT /api/users/:id/approve
// @access  Private/Admin
exports.approveAgent = asyncHandler(async (req, res, next) => {
  const { isApproved } = req.body;

  const agent = await User.findById(req.params.id);

  if (!agent) {
    return next(new ErrorResponse(`No user found with id ${req.params.id}`, 404));
  }

  if (agent.role !== 'agent') {
    return next(new ErrorResponse('Can only approve/reject agents', 400));
  }

  agent.isApproved = isApproved;
  await agent.save();

  res.status(200).json({
    success: true,
    data: agent
  });
});

// @desc    Update agent commission rate
// @route   PUT /api/users/:id/commission
// @access  Private/Admin
exports.updateCommissionRate = asyncHandler(async (req, res, next) => {
  const { commissionRate } = req.body;

  const agent = await User.findById(req.params.id);

  if (!agent) {
    return next(new ErrorResponse(`No user found with id ${req.params.id}`, 404));
  }

  if (agent.role !== 'agent' && agent.role !== 'sub-agent') {
    return next(new ErrorResponse('Can only update commission for agents and sub-agents', 400));
  }

  agent.commissionRate = commissionRate;
  await agent.save();

  // If this is an agent, update all their sub-agents' commission rates
  if (agent.role === 'agent') {
    await User.updateMany(
      { parentAgent: agent._id },
      { commissionRate: commissionRate * 0.5 }
    );
  }

  res.status(200).json({
    success: true,
    data: agent
  });
});

// @desc    Get agent by agent ID
// @route   GET /api/users/by-agent-id/:agentId
// @access  Public
exports.getAgentByAgentId = async (req, res) => {
  try {
    console.log('Looking up agent with ID:', req.params.agentId);
    
    const agent = await User.findOne({
      agentId: req.params.agentId,
      role: 'agent',
      isApproved: true
    }).select('_id name agentId');

    if (!agent) {
      console.log('No agent found with ID:', req.params.agentId);
      return res.status(404).json({
        success: false,
        error: 'No approved agent found with this ID'
      });
    }

    console.log('Found agent:', {
      id: agent._id,
      name: agent.name,
      agentId: agent.agentId
    });

    res.status(200).json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Error in getAgentByAgentId:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while verifying agent ID'
    });
  }
};
