const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function resetLeadsCollection() {
  try {
    // Log the MongoDB URI (remove sensitive parts for security)
    const uriParts = process.env.MONGODB_URI.split('@');
    console.log('MongoDB URI format:', uriParts[1] ? `...@${uriParts[1]}` : 'undefined');

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop the existing collection
    console.log('Dropping leads collection...');
    await mongoose.connection.db.dropCollection('leads');
    console.log('Leads collection dropped');

    // Create new collection without validation
    console.log('Creating new leads collection...');
    await mongoose.connection.db.createCollection('leads');
    console.log('New leads collection created');

    // Remove any existing validation
    console.log('Removing validation...');
    await mongoose.connection.db.command({
      collMod: 'leads',
      validator: {},
      validationLevel: 'off'
    });
    console.log('Validation removed');

    console.log('Successfully reset leads collection');
    process.exit(0);
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    process.exit(1);
  }
}

resetLeadsCollection(); 