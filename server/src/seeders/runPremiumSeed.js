/* eslint-disable no-console */
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const { runSeed } = require('./seed');
const { expandPremiumDataset } = require('./premiumExpansion');

async function runPremiumSeed({ silent = false } = {}) {
  const log = silent ? () => {} : console.log;
  await connectDB();
  try {
    if (!(await User.exists({}))) {
      log('Base database is empty; running standard demo seed first.');
      await runSeed({ force: true, silent });
    }
    const result = await expandPremiumDataset({ silent });
    log('Premium demo seed finished.');
    log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  runPremiumSeed({ silent: false }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runPremiumSeed };
