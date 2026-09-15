/* eslint-disable no-console */
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const { runSeed } = require('./seed');
const { seedPremiumData } = require('./premiumSeed');
const { expandPremiumDataset } = require('./premiumExpansion');

/**
 * Full premium demo seed pipeline:
 *   1. Base catalogue (only on an empty DB, preserving any existing data)
 *   2. Premium AI/ops layer for the base events (predictions, risk, trust, SEO, …)
 *   3. High-volume premium expansion (420 users, 64 events, thousands of
 *      registrations/tickets and every connected collection)
 *
 * The pipeline is idempotent and safe to re-run:
 *   - runSeed never wipes an existing database on its own
 *   - seedPremiumData resets only the advanced analytics collections and skips
 *     when its marker is present
 *   - expandPremiumDataset deletes and recreates only its own `premiumx` scoped data
 */
async function runPremiumSeed({ silent = false } = {}) {
  const log = silent ? () => {} : console.log;
  await connectDB();
  try {
    if (!(await User.exists({}))) {
      log('… Base database is empty; running standard demo seed first.');
      await runSeed({ force: true, silent });
    }
    await seedPremiumData({ silent });
    const result = await expandPremiumDataset({ silent });
    log('✓ Premium demo seed finished.');
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
