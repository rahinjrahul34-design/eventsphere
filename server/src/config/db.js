const mongoose = require('mongoose');
const dns = require('dns');
const config = require('./index');

let mongod = null;

/**
 * Connects to MongoDB. If MONGO_URI is provided it is used directly;
 * otherwise an in-memory MongoDB is spun up via mongodb-memory-server
 * (zero external dependencies for demos/tests).
 */
async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const testMongoUri = process.env.TEST_MONGO_URI || '';
  let uri = config.env === 'test' ? testMongoUri : config.mongoUri;

  if (uri.startsWith('mongodb+srv://')) {
    const dnsServers = (process.env.MONGODB_DNS_SERVERS || '8.8.8.8,1.1.1.1')
      .split(',')
      .map((server) => server.trim())
      .filter(Boolean);
    dns.setServers(dnsServers);
  }

  if (!uri) {
    // Lazy-require so production deployments with a real URI never download the binary.
    const { MongoMemoryServer } = require('mongodb-memory-server');
    try {
      if (!mongod || !(await mongod.checkInstance())) {
        mongod = await MongoMemoryServer.create({
          instance: { dbName: 'eventsphere', port: 0 },
        });
      }
    } catch (err) {
      throw new Error([
        'Could not start the automatic in-memory MongoDB.',
        'Set MONGO_URI in server/.env to a running MongoDB connection string,',
        'or install/start MongoDB locally before running the API.',
        `Original error: ${err.message}`,
      ].join(' '), { cause: err });
    }
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
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (error) {
    // Graceful fallback for already-closed or transient shutdown states.
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }

  if (mongod) {
    try {
      await mongod.stop({ doCleanup: true, force: true });
    } finally {
      mongod = null;
    }
  }
}

module.exports = { connectDB, disconnectDB };
