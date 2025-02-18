const express = require('express');
const {
  sendContactMessage,
  getContactMessages,
  updateContactStatus
} = require('../controllers/contact');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/', sendContactMessage);

// Admin only routes
router.use(protect);
router.use(authorize('admin'));
router.get('/', getContactMessages);
router.put('/:id', updateContactStatus);

module.exports = router;
