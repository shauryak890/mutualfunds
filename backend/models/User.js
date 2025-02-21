const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ROLES = {
  ADMIN: 'admin',
  AGENT: 'agent',
  SUB_AGENT: 'sub-agent',
  USER: 'user'
};

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.USER
  },
  parentAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number']
  },
  address: {
    type: String,
    required: [true, 'Please provide an address']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  commissionRate: {
    type: Number,
    default: 2 // 2% commission rate
  },
  agentId: {
    type: String,
    unique: true,
    sparse: true // Allows null/undefined values
  }
});

// Update the pre-save middleware with better agentId generation
userSchema.pre('save', async function(next) {
  try {
    console.log('Pre-save middleware running for:', this.email);

    // Hash password if modified
    if (this.isModified('password')) {
      console.log('Password modified, hashing...');
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // Generate agentId for new agents/sub-agents
    if ((this.role === 'agent' || this.role === 'sub-agent') && !this.agentId) {
      console.log('Generating agent ID...');
      
      // Find the highest existing agentId
      const highestAgent = await this.constructor.findOne({
        agentId: { $exists: true }
      }).sort({ agentId: -1 });

      let nextNumber = 1;
      if (highestAgent && highestAgent.agentId) {
        // Extract the number from existing highest agentId (AG0002 -> 2)
        const currentNumber = parseInt(highestAgent.agentId.replace('AG', ''), 10);
        nextNumber = currentNumber + 1;
      }

      // Generate new agentId with padded number
      this.agentId = `AG${String(nextNumber).padStart(4, '0')}`;
      console.log('Generated new agent ID:', this.agentId);
    }

    console.log('Pre-save middleware completed successfully');
    next();
  } catch (error) {
    console.error('Pre-save middleware error:', {
      message: error.message,
      stack: error.stack
    });
    next(error);
  }
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  try {
    const token = jwt.sign(
      { id: this._id },
      process.env.JWT_SECRET || 'fallback_secret',
      {
        expiresIn: process.env.JWT_EXPIRE || '30d'
      }
    );
    console.log('JWT generation successful');
    return token;
  } catch (error) {
    console.error('JWT generation error:', error);
    throw error;
  }
};

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add after schema definition
userSchema.post('validate', function(doc) {
  console.log('Validation passed for:', {
    email: doc.email,
    role: doc.role,
    hasPassword: !!doc.password,
    hasPhone: !!doc.phone,
    hasAddress: !!doc.address
  });
});

userSchema.post('save', function(doc) {
  console.log('User saved successfully:', {
    id: doc._id,
    email: doc.email,
    role: doc.role
  });
});

// Add this after your schema definition
userSchema.virtual('subAgents', {
  ref: 'User',
  localField: '_id',
  foreignField: 'parentAgent',
  justOne: false
});

// Make sure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
