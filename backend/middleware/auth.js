const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// List of public routes that don't need authentication
const PUBLIC_ROUTES = [
  '/api/test',
  '/api/auth/register',
  '/api/auth/login',
  '/api/users/agents',
  '/api/users/by-agent-id'
];

exports.protect = async (req, res, next) => {
  try {
    console.log('Auth middleware checking:', req.originalUrl);

    // Check if route is public
    const isPublicRoute = PUBLIC_ROUTES.some(route => 
      req.originalUrl === route || req.originalUrl.startsWith(route)
    );

    if (isPublicRoute) {
      console.log('Public route, skipping auth');
      return next();
    }

    // Get token from header
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Please provide a valid authentication token'
      });
    }

    try {
      // Verify token
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if user is approved
      if (!user.isApproved) {
        return res.status(401).json({
          success: false,
          error: 'Account pending approval'
        });
      }

      // Add user to request
      req.user = user;
      next();
    } catch (err) {
      console.error('Token verification failed:', err);
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Authorizing role:', req.user.role, 'Required roles:', roles); // Debug role check
    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`User role ${req.user.role} is not authorized to access this route`, 403));
    }
    next();
  };
};
