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
    'https://budgetbrilliance.in'    // Include non-www version too
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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
