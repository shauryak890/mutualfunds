const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    mongoose.set('strictQuery', false);
    
    console.log('Attempting to connect to MongoDB:', process.env.MONGODB_URI);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Add this to log when the connection is ready
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to db');
    });

    // Add error handler
    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });

    // Test the connection
    await mongoose.connection.db.admin().ping();
    console.log('MongoDB connection is healthy');

  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB; 