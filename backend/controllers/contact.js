const Contact = require('../models/Contact');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Send contact message
// @route   POST /api/contact
// @access  Public
exports.sendContactMessage = asyncHandler(async (req, res, next) => {
  const contact = await Contact.create(req.body);

  res.status(201).json({
    success: true,
    data: contact,
    message: 'Thank you for contacting us! We will get back to you soon.'
  });
});

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private/Admin
exports.getContactMessages = asyncHandler(async (req, res, next) => {
  const messages = await Contact.find().sort('-createdAt');

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages
  });
});

// @desc    Update contact message status
// @route   PUT /api/contact/:id
// @access  Private/Admin
exports.updateContactStatus = asyncHandler(async (req, res, next) => {
  let message = await Contact.findById(req.params.id);

  if (!message) {
    return next(new ErrorResponse(`Message not found with id of ${req.params.id}`, 404));
  }

  message = await Contact.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: message
  });
});
