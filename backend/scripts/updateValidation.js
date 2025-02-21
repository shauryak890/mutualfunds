require('dotenv').config();
const mongoose = require('mongoose');

async function updateValidation() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Drop both collections if they exist
    try {
      await db.collection('leads').drop();
      console.log('Dropped old leads collection');
    } catch (e) {
      console.log('No old leads collection to drop');
    }

    try {
      await db.collection('new_leads').drop();
      console.log('Dropped new_leads collection');
    } catch (e) {
      console.log('No new_leads collection to drop');
    }

    // Create fresh leads collection
    console.log('Creating fresh leads collection...');
    await db.createCollection("leads", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["customerName", "customerPhone", "customerEmail", "investmentType", "investmentAmount"],
          properties: {
            customerName: { bsonType: "string" },
            customerPhone: { bsonType: "string" },
            customerEmail: { bsonType: "string" },
            customerAddress: { bsonType: "string" },
            investmentType: { bsonType: "string" },
            investmentAmount: { bsonType: "number" },
            notes: { bsonType: "string" },
            status: { bsonType: "string" },
            agent: { bsonType: "objectId" }
          }
        }
      },
      validationLevel: "off",
      validationAction: "warn"
    });
    console.log('Collection created successfully');

    // List all collections after update
    const finalCollections = await db.listCollections().toArray();
    console.log('Current collections:', finalCollections.map(c => c.name));

    process.exit(0);
  } catch (error) {
    console.error('Error:', {
      message: error.message,
      code: error.code,
      codeName: error.codeName,
      details: error
    });
    process.exit(1);
  }
}

updateValidation(); 