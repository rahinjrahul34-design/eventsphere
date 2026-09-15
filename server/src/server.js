const http = require('http');
const app = require('./app');
const config = require('./config');
const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets');
const { runSeed } = require('./seeders/seed');
const { seedPremiumData } = require('./seeders/premiumSeed');


async function start() {
  await connectDB();

  // In demo mode or when database is completely empty, ensure seed data exists
  if (config.seedOnStart) {
    await runSeed({ silent: false });
  } else {
    // Even if SEED_ON_START=false, seed if the database has 0 users (e.g. in-memory MongoDB fresh restart)
    await runSeed({ force: false, silent: false });
  }
  await seedPremiumData({ silent: false });

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
