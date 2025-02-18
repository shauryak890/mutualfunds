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
    sparse: true  // Only enforce uniqueness if field exists
  }
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Generate agentId for new agents/sub-agents
  if ((this.role === 'agent' || this.role === 'sub-agent') && !this.agentId) {
    const count = await this.constructor.countDocuments({ 
      role: { $in: ['agent', 'sub-agent'] } 
    });
    this.agentId = `AG${String(count + 1).padStart(4, '0')}`;
  }

  next();
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

module.exports = mongoose.model('User', userSchema);
