const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

exports.protect = async (req, res, next) => {
  try {
    let token;
    console.log('Headers:', req.headers); // Debug headers

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token found:', token); // Debug token
    }

    if (!token) {
      console.log('No token found in request'); // Debug no token
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded); // Debug decoded token
      
      req.user = await User.findById(decoded.id);
      console.log('Found user:', req.user ? req.user.email : 'none'); // Debug user

      if (!req.user) {
        return next(new ErrorResponse('User not found', 401));
      }

      next();
    } catch (err) {
      console.error('Token verification error:', err); // Debug token error
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }
  } catch (err) {
    next(err);
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
