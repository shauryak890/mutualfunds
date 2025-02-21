require('dotenv').config();
const mongoose = require('mongoose');

async function dropCollection() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully');

    // Drop the collection
    await mongoose.connection.db.collection('leads').drop();
    console.log('Leads collection dropped successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

dropCollection(); 