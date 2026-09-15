const http = require('http');
const app = require('./app');
const config = require('./config');
const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets');
const User = require('./models/User');
const { runSeed } = require('./seeders/seed');
const { seedPremiumData } = require('./seeders/premiumSeed');
const { expandPremiumDataset } = require('./seeders/premiumExpansion');


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

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`\n🚀 EventSphere API running at http://localhost:${config.port}`);
    console.log(`   Demo mode: ${config.demoMode ? 'ON' : 'OFF'} | Gemini: ${config.gemini.apiKey ? 'configured' : 'demo engine'}`);
    if (process.env.MONGO_URI) console.log(`   Database: external MongoDB`);
  });

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
