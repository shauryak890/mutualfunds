require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const errorHandler = require('./middleware/error');
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const { publicRoutes, protectedRoutes } = require('./routes/users');
const payoutRoutes = require('./routes/payouts');
const dashboardRoutes = require('./routes/dashboard');
const newsRoutes = require('./routes/newsRoutes');
const mutualFundsRoutes = require('./routes/mutualFundsRoutes');
const agentRoutes = require('./routes/agents');
const connectDB = require('./config/db');
const { protect } = require('./middleware/auth');
const User = require('./models/User');

const app = express();

// Environment variables check (move to top)
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRE',
  'JWT_COOKIE_EXPIRE'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('Please check your .env file');
  process.exit(1);
}

// Basic middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://www.budgetbrilliance.in',
    'https://budgetbrilliance.in',
    'https://muthualfuunds.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: ['Content-Length', 'X-Total-Count']
}));

// Add this right after your CORS middleware
app.use((req, res, next) => {
  // Set CORS headers for all responses
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log('\n🔍 Request:', {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    body: req.method === 'POST' ? { ...req.body, password: '[REDACTED]' } : undefined
  });
  next();
});

// Add these before any route definitions
mongoose.set('strictQuery', false);
mongoose.set('debug', true);

// Add more detailed connection logging
mongoose.connection.on('connecting', () => {
  console.log('⌛ Connecting to MongoDB...');
});

mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB');
});

mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.once('open', () => {
  console.log('🚀 MongoDB connection opened');
  // Log all collections and their validation rules
  const db = mongoose.connection.db;
  db.listCollections().toArray((err, collections) => {
    if (err) {
      console.error('Error listing collections:', err);
      return;
    }
    collections.forEach(async (collection) => {
      try {
        const options = await db.collection(collection.name).options();
        console.log(`Collection ${collection.name} options:`, options);
      } catch (e) {
        console.error(`Error getting options for ${collection.name}:`, e);
      }
    });
  });
});

// Public routes (no auth required)
app.get('/api/test', (req, res) => {
  console.log('Test route hit');
  res.json({ 
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Public user routes
app.use('/api/users', publicRoutes);

// Protected routes
const protectedRouter = express.Router();
protectedRouter.use(protect);
protectedRouter.use('/users', protectedRoutes);
protectedRouter.use('/leads', leadRoutes);
protectedRouter.use('/payouts', payoutRoutes);
protectedRouter.use('/dashboard', dashboardRoutes);
protectedRouter.use('/news', newsRoutes);
protectedRouter.use('/mutual-funds', mutualFundsRoutes);
protectedRouter.use('/agents', agentRoutes);

// Mount protected routes
app.use('/api', protectedRouter);

// 404 handler
app.use((req, res, next) => {
  console.log('404 Not Found:', req.originalUrl);
  res.status(404).json({
    success: false,
    error: `Route not found - ${req.originalUrl}`
  });
});

// Error handler
app.use(errorHandler);

// Database connection
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}
📝 API Documentation: http://localhost:${PORT}/api/test
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
