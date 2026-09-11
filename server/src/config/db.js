const mongoose = require('mongoose');
const config = require('./index');

let mongod = null;

/**
 * Connects to MongoDB. If MONGO_URI is provided it is used directly;
 * otherwise an in-memory MongoDB is spun up via mongodb-memory-server
 * (zero external dependencies for demos/tests).
 */
async function connectDB() {
  let uri = config.mongoUri;

  if (!uri) {
    // Lazy-require so production deployments with a real URI never download the binary.
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'eventsphere', port: 0 },
    });
    uri = mongod.getUri('eventsphere');
    console.log('⚙️  Using in-memory MongoDB (demo mode)');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log(`✓ MongoDB connected (${uri.replace(/\/\/.*@/, '//***@')})`);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

module.exports = { connectDB, disconnectDB };
