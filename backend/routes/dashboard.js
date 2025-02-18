const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Payout = require('../models/Payout');

// @route   GET /api/dashboard
// @desc    Get agent dashboard data
// @access  Private (agent only)
router.get('/', protect, authorize('agent', 'sub-agent'), async (req, res) => {
  try {
    // Get last 6 months for AUM growth
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Calculate dashboard metrics
    const [
      activeClients,
      recentTransactions,
      aumGrowth,
      monthlyCommission,
      portfolioDistribution
    ] = await Promise.all([
      // Active clients count
      Lead.countDocuments({ 
        agent: req.user._id, 
        status: 'active' 
      }),

      // Recent transactions
      Lead.find({ 
        agent: req.user._id,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
      .populate('clientId', 'name')
      .populate('fundId', 'name')
      .sort('-createdAt')
      .limit(5),

      // AUM growth (last 6 months)
      Lead.aggregate([
        {
          $match: {
            agent: req.user._id,
            status: 'active',
            createdAt: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            total: { $sum: '$investmentAmount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Monthly commission
      Payout.aggregate([
        {
          $match: {
            agent: req.user._id,
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      // Portfolio distribution
      Lead.aggregate([
        {
          $match: {
            agent: req.user._id,
            status: 'active'
          }
        },
        {
          $group: {
            _id: '$fundType',
            total: { $sum: '$investmentAmount' }
          }
        }
      ])
    ]);

    // Calculate total AUM
    const totalAUM = await Lead.aggregate([
      {
        $match: {
          agent: req.user._id,
          status: 'active'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$investmentAmount' }
        }
      }
    ]);

    // Calculate SIP book value
    const sipBook = await Lead.aggregate([
      {
        $match: {
          agent: req.user._id,
          status: 'active',
          investmentType: 'SIP'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$monthlyAmount' }
        }
      }
    ]);

    // Sample goal progress (you may want to create a separate model for goals)
    const goalProgress = [
      {
        title: 'Monthly Target',
        current: monthlyCommission[0]?.total || 0,
        target: 100000,
        progress: ((monthlyCommission[0]?.total || 0) / 100000) * 100
      },
      {
        title: 'Client Acquisition',
        current: activeClients,
        target: 50,
        progress: (activeClients / 50) * 100
      }
    ];

    res.json({
      stats: {
        totalAUM: totalAUM[0]?.total || 0,
        activeClients,
        monthlyCommission: monthlyCommission[0]?.total || 0,
        sipBook: sipBook[0]?.total || 0
      },
      recentTransactions,
      aumGrowth,
      portfolioDistribution,
      goalProgress
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
