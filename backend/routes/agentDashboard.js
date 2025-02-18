const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Agent = require('../models/Agent');
const Transaction = require('../models/Transaction');
const Client = require('../models/Client');

// @route   GET /api/dashboard
// @desc    Get agent dashboard data
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const agent = await Agent.findById(req.user.id);
    if (!agent) {
      return res.status(404).json({ msg: 'Agent not found' });
    }

    // Get total AUM
    const totalAUM = await Transaction.aggregate([
      { $match: { agentId: agent._id, status: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Get active clients count
    const activeClients = await Client.countDocuments({ 
      agentId: agent._id, 
      status: 'Active' 
    });

    // Get monthly commission
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const monthlyCommission = await Transaction.aggregate([
      {
        $match: {
          agentId: agent._id,
          status: 'Completed',
          createdAt: { $gte: currentMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$commission' }
        }
      }
    ]);

    // Get SIP book value
    const sipBook = await Transaction.aggregate([
      {
        $match: {
          agentId: agent._id,
          type: 'SIP',
          status: 'Active'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get recent transactions
    const recentTransactions = await Transaction.find({ agentId: agent._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('clientId', 'name')
      .populate('fundId', 'name category');

    // Get AUM growth data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const aumGrowth = await Transaction.aggregate([
      {
        $match: {
          agentId: agent._id,
          status: 'Completed',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get portfolio distribution
    const portfolioDistribution = await Transaction.aggregate([
      {
        $match: {
          agentId: agent._id,
          status: 'Completed'
        }
      },
      {
        $lookup: {
          from: 'funds',
          localField: 'fundId',
          foreignField: '_id',
          as: 'fund'
        }
      },
      {
        $unwind: '$fund'
      },
      {
        $group: {
          _id: '$fund.category',
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate goal progress
    const goals = agent.goals || [];
    const goalProgress = goals.map(goal => {
      const progress = (goal.current / goal.target) * 100;
      return {
        title: goal.title,
        target: goal.target,
        current: goal.current,
        progress: Math.min(progress, 100)
      };
    });

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
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
