const mongoose = require('mongoose');
const config = require('../config/db');

const migrateLeads = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Drop the old leads collection
    await mongoose.connection.db.dropCollection('leads');
    
    console.log('Successfully dropped old leads collection');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

migrateLeads(); 