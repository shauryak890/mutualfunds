const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Commission = require('../models/Commission');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Lead = require('../models/Lead');
const Transaction = require('../models/Transaction');

// Protected routes - only accessible by agents
router.use(protect);
router.use(authorize('agent'));

// @desc    Get all sub-agents for an agent
// @route   GET /api/agents/sub-agents
router.get('/sub-agents', asyncHandler(async (req, res) => {
  const subAgents = await User.find({
    parentAgent: req.user._id,
    role: 'sub-agent'
  }).select('name email phone address agentId isApproved createdAt');

  res.status(200).json({
    success: true,
    count: subAgents.length,
    data: subAgents
  });
}));

// @desc    Get agent stats
// @route   GET /api/agents/stats
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = {
    totalSubAgents: await User.countDocuments({
      parentAgent: req.user._id,
      role: 'sub-agent'
    }),
    activeSubAgents: await User.countDocuments({
      parentAgent: req.user._id,
      role: 'sub-agent',
      isApproved: true,
      isActive: true
    })
  };

  res.status(200).json({
    success: true,
    data: stats
  });
}));

// Update sub-agent status
router.patch('/sub-agents/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const subAgent = await User.findOne({
    _id: req.params.id,
    parentAgent: req.user._id,
    role: 'sub-agent'
  });

  if (!subAgent) {
    return res.status(404).json({
      success: false,
      message: 'Sub-agent not found'
    });
  }

  subAgent.isActive = status === 'active';
  await subAgent.save();

  res.json({
    success: true,
    data: subAgent
  });
}));

// Update sub-agent commission rate
router.patch('/sub-agents/:id/commission', asyncHandler(async (req, res) => {
  const { commissionRate } = req.body;
  
  if (commissionRate < 0 || commissionRate > 100) {
    return res.status(400).json({
      success: false,
      message: 'Commission rate must be between 0 and 100'
    });
  }

  const subAgent = await User.findOne({
    _id: req.params.id,
    parentAgent: req.user._id,
    role: 'sub-agent'
  });

  if (!subAgent) {
    return res.status(404).json({
      success: false,
      message: 'Sub-agent not found'
    });
  }

  subAgent.commissionRate = commissionRate;
  await subAgent.save();

  res.json({
    success: true,
    data: subAgent
  });
}));

// @desc    Get commission history
// @route   GET /api/agents/commission-history
router.get('/commission-history', protect, async (req, res) => {
  try {
    // Your commission history logic here
    const commissions = await Commission.find({ agent: req.user._id });
    res.json({
      success: true,
      data: commissions
    });
  } catch (error) {
    console.error('Commission history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commission history'
    });
  }
});

// @desc    Get agent dashboard data
// @route   GET /api/agents/dashboard
router.get('/dashboard', protect, authorize('agent'), asyncHandler(async (req, res) => {
  try {
    console.log('Dashboard request from agent:', req.user.agentId);

    // Validate user
    if (!req.user || !req.user._id) {
      console.error('Invalid user in request:', req.user);
      return res.status(400).json({
        success: false,
        error: 'Invalid user request'
      });
    }

    // Get all leads for this agent
    const leads = await Lead.find({ agent: req.user._id });
    console.log('Found leads:', leads.length);

    const approvedLeads = leads.filter(lead => lead.status === 'approved');
    const pendingLeads = leads.filter(lead => lead.status === 'pending');
    
    // Calculate total AUM from approved leads
    const totalAUM = approvedLeads.reduce((sum, lead) => sum + lead.investmentAmount, 0);
    const pendingAUM = pendingLeads.reduce((sum, lead) => sum + lead.investmentAmount, 0);
    
    // Get unique clients (both approved and pending)
    const activeClients = new Set(approvedLeads.map(lead => lead.customerName)).size;
    const pendingClients = new Set(pendingLeads.map(lead => lead.customerName)).size;
    
    // Calculate monthly commission (from last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCommissions = await Commission.find({
      agentId: req.user.agentId,
      createdAt: { $gte: thirtyDaysAgo },
      status: 'paid'
    });
    
    const monthlyCommission = recentCommissions.reduce((sum, comm) => sum + comm.amount, 0);

    // Get SIP leads
    const sipLeads = approvedLeads.filter(lead => lead.investmentType === 'SIP');
    const sipBook = sipLeads.reduce((sum, lead) => sum + lead.investmentAmount, 0);

    // Get AUM growth (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyAUM = await Lead.aggregate([
      {
        $match: {
          agent: req.user._id,
          status: 'approved',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          amount: { $sum: '$investmentAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format the AUM data
    const aumGrowth = monthlyAUM.map(item => ({
      month: `${item._id.month}/${item._id.year}`,
      amount: item.amount
    }));

    // Get recent transactions
    const recentTransactions = await Lead.find({ agent: req.user._id })
      .sort('-createdAt')
      .limit(5)
      .select('customerName investmentType investmentAmount status createdAt')
      .lean();

    // Portfolio distribution
    const portfolioDistribution = await Lead.aggregate([
      {
        $match: {
          agent: req.user._id,
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$investmentType',
          total: { $sum: '$investmentAmount' }
        }
      }
    ]);

    const data = {
      success: true,
      data: {
        stats: {
          totalAUM,
          pendingAUM,
          activeClients,
          pendingClients,
          totalLeads: leads.length,
          pendingLeads: pendingLeads.length,
          approvedLeads: approvedLeads.length,
          monthlyCommission,
          sipBook
        },
        aumGrowth,
        portfolioDistribution: portfolioDistribution.map(item => ({
          type: item._id,
          amount: item.total
        })),
        recentTransactions: recentTransactions.map(tx => ({
          id: tx._id,
          customerName: tx.customerName || 'N/A',
          type: tx.investmentType || 'N/A',
          amount: tx.investmentAmount || 0,
          status: tx.status || 'pending',
          date: tx.createdAt
        })),
        goalProgress: [
          {
            title: 'Monthly Target',
            current: monthlyCommission,
            target: 100000,
            progress: (monthlyCommission / 100000) * 100
          },
          {
            title: 'AUM Target',
            current: totalAUM,
            target: 10000000,
            progress: (totalAUM / 10000000) * 100
          }
        ],
        pendingLeadsList: pendingLeads.map(lead => ({
          id: lead._id,
          customerName: lead.customerName,
          type: lead.investmentType,
          amount: lead.investmentAmount,
          submittedAt: lead.createdAt,
          scheme: lead.scheme
        }))
      }
    };

    console.log('Sending dashboard data');
    res.status(200).json(data);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching dashboard data'
    });
  }
}));

module.exports = router;
