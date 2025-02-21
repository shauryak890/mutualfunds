require('dotenv').config();
const mongoose = require('mongoose');

async function cleanupCollections() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully');

    // Drop all related collections
    const collections = ['leads', 'newleads', 'new_leads'];
    for (const collection of collections) {
      try {
        await mongoose.connection.db.collection(collection).drop();
        console.log(`${collection} collection dropped successfully`);
      } catch (err) {
        console.log(`No ${collection} collection to drop`);
      }
    }

    // Remove collection validation
    try {
      await mongoose.connection.db.command({
        collMod: "new_leads",
        validator: {},
        validationLevel: "off"
      });
      console.log('Validation rules removed');
    } catch (err) {
      console.log('No validation rules to remove');
    }

    console.log('Cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupCollections(); 