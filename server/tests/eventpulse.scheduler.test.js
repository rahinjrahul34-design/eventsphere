/**
 * EventPulse Recalculation Scheduler — DB-free unit tests (CORE FEATURE 50)
 *
 * Verifies debounce/coalescing, per-event cooldown, and that scheduling
 * never throws even when the prediction engine is unavailable.
 */

const { scheduleEventPulseRecalc, resetScheduler, DEBOUNCE_MS, MIN_INTERVAL_MS } = require('../src/services/eventpulse/recalcScheduler');

describe('EventPulse Recalculation Scheduler', () => {
  beforeEach(() => {
    resetScheduler();
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    resetScheduler();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('coalesces bursts into a single engine run after the debounce window', async () => {
    const engine = require('../src/services/eventpulse/eventPulseEngine');
    const spy = jest.spyOn(engine, 'getOrComputePrediction').mockResolvedValue({});

    scheduleEventPulseRecalc('a', 'registration');
    jest.advanceTimersByTime(5000);
    scheduleEventPulseRecalc('a', 'registration');
    jest.advanceTimersByTime(5000);
    scheduleEventPulseRecalc('a', 'registration');

    // Still inside the debounce window — nothing ran yet
    expect(spy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(DEBOUNCE_MS + 10);
    await Promise.resolve();
    await Promise.resolve();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('a', true); // force refresh on background runs
  });

  test('enforces the per-event cooldown between runs', async () => {
    const engine = require('../src/services/eventpulse/eventPulseEngine');
    const spy = jest.spyOn(engine, 'getOrComputePrediction').mockResolvedValue({});

    scheduleEventPulseRecalc('b', 'registration');
    jest.advanceTimersByTime(DEBOUNCE_MS + 10);
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(1);

    // Second signal immediately after a run must be skipped by the cooldown
    scheduleEventPulseRecalc('b', 'checkin');
    jest.advanceTimersByTime(DEBOUNCE_MS + 10);
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(1);

    // After the full cooldown a new signal is accepted again
    jest.advanceTimersByTime(MIN_INTERVAL_MS);
    scheduleEventPulseRecalc('b', 'checkin');
    jest.advanceTimersByTime(DEBOUNCE_MS + 10);
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('schedules independently per event', async () => {
    const engine = require('../src/services/eventpulse/eventPulseEngine');
    const spy = jest.spyOn(engine, 'getOrComputePrediction').mockResolvedValue({});

    scheduleEventPulseRecalc('c1', 'registration');
    scheduleEventPulseRecalc('c2', 'feedback');
    jest.advanceTimersByTime(DEBOUNCE_MS + 10);
    await Promise.resolve();
    await Promise.resolve();

    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('never throws when the engine rejects (graceful degradation)', async () => {
    const engine = require('../src/services/eventpulse/eventPulseEngine');
    jest.spyOn(engine, 'getOrComputePrediction').mockRejectedValue(new Error('model unavailable'));

    expect(() => scheduleEventPulseRecalc('d', 'registration')).not.toThrow();
    jest.advanceTimersByTime(DEBOUNCE_MS + 10);
    await Promise.resolve();
    await Promise.resolve();
    // No unhandled rejection — test passes if it reaches this point
  });

  test('ignores invalid event ids', () => {
    expect(() => scheduleEventPulseRecalc(undefined)).not.toThrow();
    expect(() => scheduleEventPulseRecalc('')).not.toThrow();
    expect(() => scheduleEventPulseRecalc('undefined')).not.toThrow();
  });
});
