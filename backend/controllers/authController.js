const Agent = require('../models/Agent');
const generateAgentId = require('../utils/generateAgentId');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register agent
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      parentAgentId
    } = req.body;

    // Check if email already exists
    const existingAgent = await Agent.findOne({ email });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // If registering as sub-agent, validate parent agent
    if (role === 'sub-agent') {
      const parentAgent = await Agent.findOne({ 
        agentId: parentAgentId,
        role: 'agent',
        status: 'active'
      });

      if (!parentAgent) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive parent agent ID'
        });
      }
    }

    // Generate unique agent ID
    const agentId = await generateAgentId(role);

    // Create agent
    const agent = await Agent.create({
      agentId,
      firstName,
      lastName,
      email,
      password,
      role,
      parentAgentId: role === 'sub-agent' ? parentAgentId : undefined,
      status: role === 'agent' ? 'active' : 'pending' // Agents are active immediately, sub-agents need approval
    });

    // Generate token
    const token = generateToken(agent._id);

    res.status(201).json({
      success: true,
      data: {
        agentId: agent.agentId,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        role: agent.role,
        status: agent.status,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Login agent
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if agent exists
    const agent = await Agent.findOne({ email });
    if (!agent) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await agent.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if agent is active
    if (agent.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Generate token
    const token = generateToken(agent._id);

    res.json({
      success: true,
      data: {
        agentId: agent.agentId,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        role: agent.role,
        status: agent.status,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get current agent
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const agent = await Agent.findById(req.agent.id).select('-password');
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update agent profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const agent = await Agent.findById(req.agent.id);

    if (email && email !== agent.email) {
      const existingAgent = await Agent.findOne({ email });
      if (existingAgent) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    agent.firstName = firstName || agent.firstName;
    agent.lastName = lastName || agent.lastName;
    agent.email = email || agent.email;
    if (password) {
      agent.password = password;
    }

    await agent.save();

    res.json({
      success: true,
      data: {
        agentId: agent.agentId,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        role: agent.role,
        status: agent.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
