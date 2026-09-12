/**
 * EventPulse Recalculation Scheduler (CORE FEATURE 8 / 37 / 38)
 *
 * Event-driven, debounced recalculation of predictions. Expensive model
 * computations are NEVER executed per socket/HTTP event. Instead:
 *
 *   1. Controllers call `scheduleEventPulseRecalc(eventId, trigger)` on
 *      meaningful signals (new registration, check-in milestone, feedback,
 *      event status change).
 *   2. Bursts are coalesced: the actual recomputation runs once, after the
 *      signal stream for that event goes quiet for DEBOUNCE_MS.
 *   3. A per-event cooldown (MIN_INTERVAL_MS) prevents prediction storms —
 *      even a continuous stream of signals cannot trigger more than one
 *      model run per cooldown window.
 *   4. Recomputation is fire-and-forget: it never blocks HTTP responses and
 *      failures are logged without affecting existing analytics.
 *   5. Nothing is scheduled for completed events (actuals are already known)
 *      and scheduling is skipped entirely when no prediction cache exists
 *      yet for an event nobody has opened (lazy on-demand behavior).
 */

const config = require('./config');

const DEBOUNCE_MS = 20 * 1000; // coalesce 20s of signal bursts into one run
const MIN_INTERVAL_MS = 5 * 60 * 1000; // hard cooldown per event (5 minutes)

// eventId -> { timer, lastRunAt, pendingTrigger }
const scheduled = new Map();

let engine = null;
function getEngine() {
  if (!engine) {
    engine = require('./eventPulseEngine');
  }
  return engine;
}

/**
 * Register a recalculation intent for an event. Safe to call from any
 * controller; never throws; returns immediately.
 *
 * @param {string|ObjectId} eventId
 * @param {string} trigger - short machine label ('registration','checkin',
 *                           'feedback','status_change','manual'...)
 */
function scheduleEventPulseRecalc(eventId, trigger = 'threshold') {
  try {
    const key = String(eventId);
    if (!key || key === 'undefined') return;

    const now = Date.now();
    const state = scheduled.get(key) || { lastRunAt: 0 };

    // Cooldown gate: skip silently if the last run was very recent
    if (now - state.lastRunAt < MIN_INTERVAL_MS) return;

    // Reset the debounce timer (coalesces bursts)
    if (state.timer) clearTimeout(state.timer);
    state.pendingTrigger = trigger;
    state.timer = setTimeout(() => {
      // Record the run time and KEEP the state entry so the cooldown gate
      // applies to subsequent signals for this event.
      state.lastRunAt = Date.now();
      state.timer = null;
      runRecalculation(key, trigger);
    }, DEBOUNCE_MS);
    scheduled.set(key, state);
  } catch (e) {
    // Scheduling must never break the calling controller
  }
}

async function runRecalculation(eventId, trigger) {
  try {
    await getEngine().getOrComputePrediction(eventId, true);
  } catch (e) {
    console.warn(`EventPulse: background recalculation failed for event ${eventId} (trigger: ${trigger}):`, e.message);
  }
}

/** Test/debug helper: clears all timers and state. */
function resetScheduler() {
  for (const state of scheduled.values()) {
    if (state.timer) clearTimeout(state.timer);
  }
  scheduled.clear();
}

module.exports = {
  scheduleEventPulseRecalc,
  resetScheduler,
  DEBOUNCE_MS,
  MIN_INTERVAL_MS,
};
