const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Payout = require('../models/Payout');

// Get all payouts (admin)
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    const payouts = await Payout.find().populate('agent', 'name email');
    res.json({ success: true, data: payouts });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get agent's payouts
router.get('/my-payouts', protect, authorize('agent', 'sub-agent'), async (req, res) => {
  try {
    const payouts = await Payout.find({ agent: req.user.id });
    res.json({ success: true, data: payouts });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update payout status (admin only)
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const payout = await Payout.findById(req.params.id);

    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }

    payout.status = status;
    await payout.save();

    res.json({ success: true, data: payout });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get payout statistics
router.get('/statistics', protect, async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const query = userId ? { agent: userId } : {};
    const payouts = await Payout.find({
      ...query,
      month: { $gte: startDate }
    }).sort('month');

    res.json({ success: true, data: payouts });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
