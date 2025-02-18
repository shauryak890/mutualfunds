const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone, address, role, parentAgentId } = req.body;

  // Create user with the specified role
  const user = await User.create({
    name,
    email,
    password,
    phone,
    address,
    role: role || 'user',
    parentAgent: parentAgentId || null,
    isApproved: role === 'user' || role === 'admin' // Only auto-approve regular users and admins
  });

  // For agents, send a different response
  if (user.role === 'agent' || user.role === 'sub-agent') {
    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please wait for admin approval to access your account.',
      data: {
        name: user.name,
        email: user.email,
        role: user.role,
        agentId: user.agentId,
        isApproved: user.isApproved
      }
    });
  }

  // For regular users, send token response
  sendTokenResponse(user, 200, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  console.log('Login attempt for:', email);

  try {
    // Check for user
    const user = await User.findOne({ email }).select('+password');
    console.log('Found user:', user ? 'yes' : 'no');
    
    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    console.log('Password match:', isMatch ? 'yes' : 'no');
    
    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    try {
      // Generate token
      const token = user.getSignedJwtToken();
      console.log('Token generated:', token ? 'yes' : 'no');

      // Create response object
      const responseObj = {
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
          agentId: user.agentId,
          phone: user.phone,
          address: user.address
        }
      };

      // Add pending approval info if needed
      if (['agent', 'sub-agent'].includes(user.role) && !user.isApproved) {
        responseObj.pendingApproval = true;
        responseObj.message = 'Your agent account is pending approval. You can still browse the site but agent features are restricted.';
      }

      // Set cookie options
      const options = {
        expires: new Date(
          Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
      };

      if (process.env.NODE_ENV === 'production') {
        options.secure = true;
      }

      console.log('Sending response');
      return res
        .status(200)
        .cookie('token', token, options)
        .json(responseObj);

    } catch (tokenError) {
      console.error('Token generation error:', tokenError);
      return next(new ErrorResponse('Error generating authentication token', 500));
    }

  } catch (error) {
    console.error('Login error:', error);
    return next(new ErrorResponse('Error processing login', 500));
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('parentAgent', 'name email agentId');
    
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create sub-agent
// @route   POST /api/auth/create-sub-agent
// @access  Private/Agent
exports.createSubAgent = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone, address } = req.body;

  // Check if parent agent exists and is approved
  const parentAgent = await User.findById(req.user.id);
  if (!parentAgent || !parentAgent.isApproved) {
    return next(new ErrorResponse('Unauthorized to create sub-agents', 401));
  }

  // Create sub-agent
  const subAgent = await User.create({
    name,
    email,
    password,
    phone,
    address,
    role: 'sub-agent',
    parentAgent: req.user.id,
    isApproved: true, // Auto-approve sub-agents created by approved agents
    commissionRate: parentAgent.commissionRate * 0.5 // Sub-agents get 50% of parent's commission
  });

  res.status(201).json({
    success: true,
    data: subAgent
  });
});

// @desc    Approve or reject agent
// @route   PUT /api/auth/approve-agent/:id
// @access  Private/Admin
exports.approveAgent = asyncHandler(async (req, res, next) => {
  const { isApproved } = req.body;
  
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }
  
  if (!['agent', 'sub-agent'].includes(user.role)) {
    return next(new ErrorResponse('User is not an agent', 400));
  }
  
  user.isApproved = isApproved;
  await user.save();
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Get all pending agents
// @route   GET /api/auth/pending-agents
// @access  Private/Admin
exports.getPendingAgents = asyncHandler(async (req, res, next) => {
  console.log('Getting pending agents, user role:', req.user.role);
  console.log('Request path:', req.path);
  console.log('Request method:', req.method);
  
  if (!req.user || req.user.role !== 'admin') {
    console.log('User not authorized:', req.user);
    return next(new ErrorResponse('Not authorized to access this route', 403));
  }
  
  const pendingAgents = await User.find({
    role: { $in: ['agent', 'sub-agent'] },
    isApproved: false
  }).select('name email role createdAt phone address');
  
  console.log('Found pending agents:', pendingAgents.length);
  
  res.status(200).json({
    success: true,
    count: pendingAgents.length,
    data: pendingAgents
  });
});

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        agentId: user.agentId,
        phone: user.phone,
        address: user.address
      }
    });
};
