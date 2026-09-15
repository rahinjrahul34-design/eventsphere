const http = require('http');
const app = require('./app');
const config = require('./config');
const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets');
const User = require('./models/User');
const { runSeed } = require('./seeders/seed');
const { seedPremiumData } = require('./seeders/premiumSeed');
const { expandPremiumDataset } = require('./seeders/premiumExpansion');

const HOST = '0.0.0.0';
const MAX_DEV_PORT_ATTEMPTS = 10;

function listenWithDevFallback(server, preferredPort, attempt = 0) {
  return new Promise((resolve, reject) => {
    const port = preferredPort + attempt;

    const onError = (err) => {
      server.off('listening', onListening);
      if (err.code === 'EADDRINUSE' && config.env !== 'production' && attempt < MAX_DEV_PORT_ATTEMPTS) {
        console.warn(`Port ${port} is already in use. Trying ${port + 1}...`);
        resolve(listenWithDevFallback(server, preferredPort, attempt + 1));
        return;
      }
      reject(err);
    };

    const onListening = () => {
      server.off('error', onError);
      resolve(port);
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, HOST);
  });
}

async function start() {
  await connectDB();

  // Capture "fresh database" before any seeding so the premium catalog only
  // auto-builds on a brand-new demo database (not on every subsequent boot).
  const wasEmpty = !(await User.exists({}));

  // In demo mode or when database is completely empty, ensure seed data exists
  if (config.seedOnStart) {
    await runSeed({ silent: false });
  } else {
    // Even if SEED_ON_START=false, seed if the database has 0 users (e.g. in-memory MongoDB fresh restart)
    await runSeed({ force: false, silent: false });
  }
  await seedPremiumData({ silent: false });

  // Build the full premium demo catalog (large interconnected dataset powering
  // every dashboard) on fresh demo boots, or when explicitly requested.
  //   SEED_PREMIUM_ON_START=true   → always rebuild the premium expansion
  //   SEED_PREMIUM_ON_START=false  → never auto-build (use `npm run seed:premium`)
  //   default                      → build once when a fresh demo DB boots
  const premiumFlag = (process.env.SEED_PREMIUM_ON_START || '').toLowerCase();
  const buildPremium = premiumFlag === 'true' || (premiumFlag !== 'false' && wasEmpty && config.demoMode);
  if (buildPremium) {
    await expandPremiumDataset({ silent: false });
  }

  const server = http.createServer(app);
  initSocket(server);

  const smartQueue = require('./services/smartqueue');
  smartQueue.expirationWorker.startWorker();

  const actualPort = await listenWithDevFallback(server, config.port);
  console.log(`\n🚀 EventSphere API running at http://localhost:${actualPort}`);
  if (actualPort !== config.port) {
    console.log(`   Requested port ${config.port} was busy, so development server used ${actualPort}.`);
  }
  console.log(`   Demo mode: ${config.demoMode ? 'ON' : 'OFF'} | Gemini: ${config.gemini.apiKey ? 'configured' : 'demo engine'}`);
  if (process.env.MONGO_URI) console.log(`   Database: external MongoDB`);

  const shutdown = async (sig) => {
    console.log(`\n${sig} received, shutting down…`);
    smartQueue.expirationWorker.stopWorker();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start EventSphere:', err);
  process.exit(1);
});
