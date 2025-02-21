const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Lead = require('../models/Lead');
const Payout = require('../models/Payout');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// Debug middleware
router.use((req, res, next) => {
  console.log('Lead route accessed:', {
    method: req.method,
    path: req.path,
    body: req.body,
    user: {
      id: req.user?._id,
      role: req.user?.role
    }
  });
  next();
});

// Create a new lead
router.post('/', protect, async (req, res) => {
  try {
    console.log('Creating lead with data:', {
      body: req.body,
      user: req.user
    });

    // Create lead with exact fields
    const leadData = {
      customerName: req.body.customerName,
      customerPhone: req.body.customerPhone,
      customerEmail: req.body.customerEmail,
      customerAddress: req.body.customerAddress,
      investmentType: req.body.investmentType,
      investmentAmount: parseFloat(req.body.investmentAmount),
      notes: req.body.notes,
      agent: req.user._id,
      status: 'pending'
    };

    // Log the schema
    console.log('Lead model schema:', Lead.schema.obj);

    try {
      // Try using create
      const lead = await Lead.create(leadData);
      console.log('Lead created with create():', lead);
      return res.status(201).json({ success: true, data: lead });
    } catch (createError) {
      console.log('Create failed, trying new + save:', createError);
      
      // Fallback to new + save
      const lead = new Lead(leadData);
      await lead.save();
      console.log('Lead created with save():', lead);
      return res.status(201).json({ success: true, data: lead });
    }

  } catch (error) {
    console.error('Lead creation error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      errors: error.errors
    });

    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get agent's leads
router.get('/my-leads', protect, authorize('agent', 'sub-agent'), async (req, res) => {
  try {
    const leads = await Lead.find({ agent: req.user.id });
    res.json({ success: true, data: leads });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get filtered leads
router.get('/filter', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const { status, agent, dateFrom, dateTo } = req.query;
  
  let query = {};
  
  if (status) {
    query.status = status;
  }
  
  if (agent) {
    query.agent = agent;
  }
  
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const leads = await Lead.find(query)
    .populate('agent', 'name email phone agentId')
    .populate('subAgent', 'name email phone agentId')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: leads.length,
    data: leads
  });
}));

// Get all leads (admin)
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Fetching all leads');
    const leads = await Lead.find()
      .populate('agent', 'name email')
      .sort('-createdAt');
    console.log(`Found ${leads.length} leads`);
    res.json({ success: true, data: leads });
  } catch (err) {
    console.error('Error fetching all leads:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get single lead by ID
router.get('/:id([0-9a-fA-F]{24})', protect, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    console.log('Fetching lead with ID:', req.params.id);
    
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead ID format'
      });
    }

    // Correct way to create a new ObjectId
    const leadId = new mongoose.Types.ObjectId(req.params.id);
    console.log('Converted to ObjectId:', leadId);

    const lead = await Lead.findById(leadId)
      .populate({
        path: 'agent',
        select: 'name email phone agentId'
      })
      .populate({
        path: 'subAgent',
        select: 'name email phone agentId'
      })
      .lean();

    console.log('Database query result:', lead);

    if (!lead) {
      console.log('Lead not found in database');
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Sanitize the response data
    const sanitizedLead = {
      _id: lead._id,
      customerName: lead.customerName || 'N/A',
      customerPhone: lead.customerPhone || 'N/A',
      customerEmail: lead.customerEmail || 'N/A',
      investmentType: lead.investmentType || 'N/A',
      investmentAmount: lead.investmentAmount || 0,
      status: lead.status || 'pending',
      createdAt: lead.createdAt,
      agent: lead.agent ? {
        name: lead.agent.name || 'N/A',
        agentId: lead.agent.agentId || 'N/A',
        phone: lead.agent.phone || 'N/A',
        email: lead.agent.email || 'N/A'
      } : null,
      subAgent: lead.subAgent ? {
        name: lead.subAgent.name || 'N/A',
        agentId: lead.subAgent.agentId || 'N/A',
        phone: lead.subAgent.phone || 'N/A',
        email: lead.subAgent.email || 'N/A'
      } : null
    };

    console.log('Sending sanitized lead:', sanitizedLead);
    res.status(200).json({
      success: true,
      data: sanitizedLead
    });
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    // Send appropriate error response
    if (error.name === 'CastError' || error.name === 'TypeError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching lead details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

// Update lead status (admin only)
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    
    // Use the new updateStatus method
    const lead = await Lead.updateStatus(req.params.id, status);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // If lead is approved, update payout
    if (status === 'approved') {
      const month = new Date(lead.createdAt);
      month.setDate(1); // Set to first day of month

      let payout = await Payout.findOne({
        agent: lead.agent,
        month: month
      });

      if (!payout) {
        payout = new Payout({
          agent: lead.agent,
          month: month,
          totalLeads: 0,
          approvedLeads: 0,
          totalAmount: 0,
          commissionRate: 0.02 // 2% default commission rate
        });
      }

      payout.totalLeads += 1;
      payout.approvedLeads += 1;
      payout.totalAmount += lead.investmentAmount * payout.commissionRate;
      await payout.save();
    }

    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating lead status'
    });
  }
});

module.exports = router;
