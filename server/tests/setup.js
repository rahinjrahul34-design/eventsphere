process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.SUPPRESS_JEST_WARNINGS = 'true';
process.env.GEMINI_API_KEY = '';

afterEach(() => {
  try {
    require('../src/services/eventpulse/recalcScheduler').resetScheduler();
  } catch (err) {
    // Some focused unit tests do not load the scheduler.
  }
});

module.exports = {};
