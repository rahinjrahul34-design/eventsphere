const http = require('http');
const app = require('./app');
const config = require('./config');
const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets');
const { runSeed } = require('./seeders/seed');

async function start() {
  await connectDB();

  if (config.seedOnStart) {
    await runSeed({ silent: false });
  }

  const server = http.createServer(app);
  initSocket(server);

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`\n🚀 EventSphere API running at http://localhost:${config.port}`);
    console.log(`   Demo mode: ${config.demoMode ? 'ON' : 'OFF'} | Gemini: ${config.gemini.apiKey ? 'configured' : 'demo engine'}`);
    if (process.env.MONGO_URI) console.log(`   Database: external MongoDB`);
  });

  const shutdown = async (sig) => {
    console.log(`\n${sig} received, shutting down…`);
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
