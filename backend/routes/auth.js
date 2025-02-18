const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  register,
  login,
  getMe,
  createSubAgent,
  getPendingAgents,
  approveAgent
} = require('../controllers/auth');

// Debug middleware BEFORE routes
router.use((req, res, next) => {
  console.log('Auth route accessed:', req.method, req.path);
  console.log('User in request:', req.user);
  next();
});

// Routes below middleware
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.post('/create-sub-agent', protect, createSubAgent);

// Admin routes for agent approval
router.get('/pending-agents', protect, authorize('admin'), getPendingAgents);
router.put('/approve-agent/:id', protect, authorize('admin'), approveAgent);

module.exports = router;
