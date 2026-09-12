# EventPulse AI — Predictive Event Engagement & Attendance Intelligence

> **What it answers:** How many people are likely to register? How many will actually attend?
> How many no-shows are expected? How engaged will the audience be? What is driving these
> numbers, what risks exist, and what should the organizer do next?

EventPulse AI is an **addition** to EventSphere — it reuses existing collections
(`Registration`, `Poll`, `Question`, `Message`, `Feedback`, `Favorite`, `Connection`,
`Event`), never replaces the existing descriptive analytics (`analyticsService`), and is
kept strictly separate from EventShield AI (safety) and TrustSphere (organizer trust).

---

## 1. Architecture

```
                    EVENT DATA (MongoDB: events, registrations, polls, questions,
                                messages, feedback, favorites, connections)
                                   │
                     FEATURE EXTRACTION  (featureExtractor.js)
                     • batch queries, no fabrication, aggregate-first
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
     RULE / STATISTICAL BASELINE              STATISTICAL REGRESSION
      (baselineModel.js)                       (regressionModel.js)
      category benchmarks, mode                weighted velocity, urgency surge,
      priors, pricing commitment               lead-time & organizer history
              └──────────────┬──────────────────────────┘
                             ▼
                  ENSEMBLE WEIGHTING (ensembleModel.js)
                             ▼
        ┌──────────┬──────────┴────────┬───────────────┬──────────────┐
        ▼          ▼                   ▼               ▼              ▼
   Attendance  Engagement         Event Health    Confidence     Drivers &
   & No-Show   Score (0-100)      Score (0-100)   Estimation     Recommendations
   (attendance (engagementService) (healthScore    (confidence    (driverService,
   Service)                       Service)        Service)       recommendationActionService)
                             ▼
                RISK ALERTS (riskAlertService.js, dedup + notification cooldown)
                             ▼
        PERSISTENCE: EventPrediction (cache) · EventPredictionSnapshot (timeline)
                     PredictionOutcome (post-event ground truth) · EventPulseAlert
                             ▼
        AI EXPLANATION LAYER (aiNarrativeService.js — Gemini *narrates only*,
        deterministic rule-engine fallback; numbers ALWAYS come from the models)
                             ▼
        Socket.IO push `eventpulse:updated` → Organizer dashboard (EventPulseTab)
```

### Model provider boundary

`services/eventpulse/models/` defines a swappable model provider interface
(`predictRegistrations(features)`, `predictAttendanceRate(features)`).
`BaselineModel` and `RegressionModel` implement it today; a
`RandomForestModel`/`GradientBoostingModel`/`TimeSeriesModel` can be added later
without touching controllers, the engine, or the dashboard (CORE FEATURE 54).

---

## 2. Feature engineering (featureExtractor.js)

All features come from real EventSphere records. **No value is fabricated.**

| Group | Features | Source |
|---|---|---|
| Event | capacity, categorySlug, eventType (offline/online/hybrid), isPaid, basePrice, views, popularityScore, favoritesCount, ticketTypesCount | `Event` |
| Registration | totalConfirmed, cancelledCount, currentCheckedIns, capacityUtilization, recommendationRegs (attribution via `registration.source`), daily 14-day series | `Registration` |
| Velocity | last24h, prev24h, last7d, avgDailyLast7d | computed from `Registration.createdAt` |
| Engagement | pollVotes (sum of `options[].voters`), questionsCount, questionUpvotes, answeredQuestions, chatMessages (`kind:'event'`), feedbackCount, avgRating, positiveFeedbacks | `Poll`, `Question`, `Message`, `Feedback` |
| Historical | organizer's completed events, aggregate historical attendance rate `Σcheck-ins/Σregistrations`, cold-start flag | `Event` (organizer's history) |
| Timing | daysSincePublication, daysRemaining, durationHours, dayOfWeek, isWeekend | `Event.startDate/endDate` |

**Cold start (CORE FEATURE 12):** `isColdStart = organizerCompletedEvents < 2 && totalConfirmed < 10`.
Cold start forces the ensemble toward the rule/statistical baseline and the UI shows a
"Cold Start Baseline" badge with the message *"Early prediction — limited historical data."*

---

## 3. Registration forecasting

### 3.1 Baseline model

```
benchmarkTarget = capacity × CATEGORY_UTILIZATION_BENCHMARKS[category]   (default 0.75)
dailyVelocity   = avgDailyLast7d  ||  totalConfirmed / daysSincePublication
runRateTarget   = totalConfirmed + round(dailyVelocity × daysRemaining)
weightRunRate   = min(0.85, D_pub / (D_pub + D_rem + 1))        # early → benchmark, late → run-rate
prediction      = clamp( (1−w)·benchmarkTarget + w·runRateTarget,  totalConfirmed,  capacity×1.15 )
```

### 3.2 Regression model

```
weightedVelocity = 0.55·last24h + 0.30·avgDailyLast7d + 0.15·(totalConfirmed/D_pub)
surgeFactor      = 1 + 0.35·e^(−daysRemaining/3)          # U-shaped last-minute curve
priceResistance  = isPaid ? 0.85 : 1.0                     # paid converts slower at the end
prediction       = clamp( totalConfirmed + round(weightedVelocity × daysRemaining
                            × surgeFactor × priceResistance),  totalConfirmed,  capacity×1.15 )
```

### 3.3 Dynamic ensemble weighting

Regression weight starts at **0.30** and grows with evidence:

```
+0.35 if totalConfirmed ≥ 50        +0.20 if daysSincePublication ≥ 7
+0.20 if totalConfirmed ≥ 15        +0.10 if daysSincePublication ≥ 3
+0.15 if organizer history ≥ 2 events        w_reg ∈ [0.15, 0.90]

final = round( w_base·baseline + w_reg·regression )        (w_base = 1 − w_reg)
```

The chosen weights are returned with every prediction — a key viva exhibit of
**hybrid architecture (CORE FEATURE 13)**.

### 3.4 Registration velocity (CORE FEATURE 3)

```
growthRate    = (V24h − Vprev24h) / max(1, Vprev24h)
acceleration  = (V24h − Vprev24h) / 24    # registrations per hour, per day
```

Momentum state uses statistical thresholds (config.VELOCITY_THRESHOLDS), never arbitrary labels:

| State | Rule |
|---|---|
| 🔥 Accelerating | V24h ≥ 3 **and** growth > +25% |
| 📈 Growing | growth > +5% |
| ➡ Stable | −10% ≤ growth ≤ +5% |
| 📉 Slowing | −30% ≤ growth < −10% |
| ⚠ Declining | growth < −30% |

---

## 4. Attendance & no-show prediction (CORE FEATURES 4, 5)

Attendance rate priors (deterministic, from industry baselines — **learned** components kick in
via organizer history blending):

```
base = MODE_BASE_ATTENDANCE[eventType]        offline 0.75 · online 0.55 · hybrid 0.68
modifier = isPaid ? +0.12 : −0.06             # payment commitment
lead-time:   daysRemaining > 30 → −0.04 · daysRemaining ≤ 3 → +0.03
if organizer history exists:  prob = 0.50·prior + 0.50·historicalAttendanceRate
clamp to [0.35, 0.95]
```

```
pool              = daysRemaining > 1 ? predictedRegistrations : totalConfirmed
expectedAttendees = round(pool × attendanceRate)
expectedNoShows   = pool − expectedAttendees
```

**Prediction range (CORE FEATURE 22)** — binomial standard deviation, z = 1.645 (≈90%):

```
σ = √( pool·p·(1−p) ) ;  range = [expected − round(1.645σ), expected + round(1.645σ)]
```

The interval is *actually computed by the model* — never faked; hidden data is never invented.

**Live adjustment:** during a live event the model switches to an arrival-curve decay:

```
elapsedRatio = (now − start) / (end − start)
lateArrivals = remainingUnchecked × attendanceRate × e^(−2.8·elapsedRatio)
expected     = min(totalConfirmed, checkedIns + round(lateArrivals))
```

For **completed** events the actuals become ground truth (the model never overrides observed reality).

---

## 5. Engagement scoring (CORE FEATURES 6, 7)

Five dimensions, each 0–100, normalized per-attendee so no single signal dominates:

| Dimension | Formula (per attendee, capped at 100) |
|---|---|
| Participation | 0.6·capacityUtilization·90 + 0.4·checkInRate |
| Interaction | 250·questions/attendee + 150·upvotes/attendee |
| Live Activity | 120·pollVotes/attendee + 60·messages/attendee |
| Feedback | 0.7·(avgRating/5·100) + 0.3·volumeScore (volume vs 30% of attendees) |
| Networking | category weight (business/tech 70, else 55) + min(30, 0.1·attendees) |

```
engagement = Σ WEIGHTS·dimension      weights: participation .25, interaction .25,
                                      liveActivity .20, feedback .15, networking .15
level: ≥80 very_high · ≥65 high · ≥45 medium · else low
trend: rising | stable | declining  (velocity-comparison based, smoothed)
```

Dimensions without data (e.g. no polls yet) fall back to capacity-based expectations and are
flagged in the UI — unavailable metrics are never fabricated.

---

## 6. Event health score (CORE FEATURE 19)

Distinct from EventShield's safety score. 0–100 weighted:

```
health = 0.30·velocityScore + 0.25·capacityScore + 0.20·attendanceRate
       + 0.15·engagementScore + 0.10·sentimentScore(positiveFeedback ratio)
status: ≥80 healthy · ≥65 good · ≥45 attention · else at_risk
```

---

## 7. Confidence engine (CORE FEATURES 11)

Confidence expresses **data sufficiency & signal stability** — *not* the probability of
correctness. The disclaimer is stored with every prediction:

```
confidence = 0.30·proximity + 0.30·history + 0.25·volume + 0.15·signalCompleteness
clamped to [25, 96]
```

* proximity — live/completed 100 · ≤3d 90 · ≤14d 75 · else 50
* history — organizer completed events ≥4 → 95 · ≥1 → 70 · cold start → 35
* volume — registrations ≥100 → 95 · ≥30 → 75 · ≥5 → 55 · else 30
* completeness — ticket types + views + live interaction signals

Every prediction carries human-readable `reasons[]` (e.g. *"Organizer has strong historical
benchmark data across 5 completed events"*).

---

## 8. Explainability — drivers (CORE FEATURE 16)

`driverService.extractPredictionDrivers` emits up to 5 attributed factors, each with
direction (positive/negative) and magnitude:

* Registration acceleration / slowdown (from §3.4)
* High capacity fill / low-utilization window
* Paid-ticket commitment vs free-event drop-off risk
* Urgency surge window (≤3 days)
* Organizer track record (strong / weak historical check-in rate)
* AI-recommendation inflow share (`registration.source === 'recommendation'`)

## 9. Action center & risk alerts (CORE FEATURES 17, 18, 47)

`recommendationActionService` maps signals → prioritized actions (each action carries the
`trigger` that produced it — no generic advice):

| Trigger signal | Priority | Action |
|---|---|---|
| velocity slowing/declining pre-event | HIGH | promotional push (email/social/speaker highlight) |
| noShowRate ≥ 30% within 5 days | HIGH | attendee reminder campaign |
| capacity utilization ≥ 90% | MEDIUM | expand tiers / manage waitlist |
| live & liveActivity < 40 | HIGH | launch interactive poll |
| ≤2 days out & zero questions | LOW | open pre-event Q&A |
| completed & feedback < 5 | MEDIUM | request feedback + issue certificates |

`riskAlertService` detects REGISTRATION_SLOWDOWN, HIGH_NO_SHOW_RISK, CAPACITY_PRESSURE,
LOW_ENGAGEMENT_PACE, ATTENDANCE_PACE_DEFICIT. Alerts are **deduplicated by upsert on
(active event, type)**; a Notification is pushed to the organizer **only on the transition
into an active state** and only for high/critical severity — a built-in anti-spam cooldown.

## 10. Recalculation strategy (CORE FEATURES 8, 37, 38)

Predictions are **never computed per request event**:

1. **Cached reads** — `GET /eventpulse` serves the cached `EventPrediction` while
   `expiresAt` is in the future (TTL 15 min).
2. **Event-driven debounce** — controllers call `recalcScheduler.scheduleEventPulseRecalc()`
   on real signals (registration confirmed, cancellation, QR check-in, feedback, status change).
   Bursts are coalesced (20 s quiet-period) and a **5-minute per-event cooldown** prevents
   prediction storms.
3. **Manual refresh** — `POST /eventpulse/analyze` (AI rate-limiter applied).
4. **Socket.IO push** — after each recompute, `eventpulse:updated` is emitted to the event
   room; the dashboard invalidates its TanStack Query cache on receipt (with 30 s polling
   as fallback).

## 11. Prediction history & accuracy (CORE FEATURES 9, 10, 34)

* **Timeline** — `EventPredictionSnapshot` stores one point per day pre-event (upserted per
  calendar day; live events record every recompute). Powers the prediction-evolution chart.
* **Outcome evaluation** — on completion, `accuracyService.evaluateCompletedEvent` persists
  `PredictionOutcome` with predicted vs actual for registrations, attendance, no-shows and
  engagement, plus absolute & percentage errors:

```
AE = |predicted − actual|            PE = AE / actual × 100        (MAPE per event)
Platform MAE = mean(AE over evaluated events)
```

* **Admin accuracy dashboard** — `GET /api/admin/eventpulse/accuracy` (admin-only) aggregates
  platform-wide MAE/MAPE and model version; surfaced on the Admin dashboard.

## 12. AI layer — what is AI and what is NOT (CORE FEATURES 41, 53)

| Layer | Technology | Role |
|---|---|---|
| Numerical predictions | Deterministic statistics + weighted ensemble (the "ML-shaped" layer) | **Source of truth for every number** |
| Narrative summary | Gemini (when `GEMINI_API_KEY` set) with strict prompt rules: use only supplied verified numbers, probabilistic language only; **deterministic rule-engine fallback** when Gemini is unavailable | Explanation |
| NL Q&A | Intent routing over verified prediction object (`/eventpulse/query`) | Assistant |

The AI **cannot** invent attendee numbers, rates, dates or confidence values — it narrates
backend evidence. If Gemini fails, predictions and the full dashboard continue to work
(CORE FEATURE 43: graceful degradation).

## 13. Security & privacy (CORE FEATURES 39, 40)

* Every endpoint requires JWT (`requireAuth`) **plus organizer ownership** (organizer or
  co-organizer of the event; admins bypass) — enforced in `authorizeEventAccess`.
* Attendees can never read no-show expectations, risk alerts, drivers or model diagnostics.
* The admin accuracy route is gated by `req.user.role === 'admin'`.
* Only aggregate signals are used — no individual-level profiling, no sensitive inference.
* AI keys stay server-side; the client only ever receives predictions + narrative.

## 14. Demo / simulation mode (CORE FEATURE 49)

`POST /eventpulse/simulate` runs the full model pipeline on a **deep-cloned feature set**
with organizer-supplied overrides (capacity, registrations, lead time, pricing, reminder).
Responses are stamped `isSimulation: true` and labeled
**"DEMO / SIMULATION MODE — SYNTHETIC DATA"**. Nothing persists; production records are
never mixed with synthetic data.

## 15. API surface (adapted to existing conventions)

| Method & path | Purpose |
|---|---|
| `GET /api/events/:id/eventpulse` | Cached prediction (organizer/admin only) |
| `POST /api/events/:id/eventpulse/analyze` | Force recalculation (rate-limited) |
| `GET /api/events/:id/eventpulse/history` | Timeline snapshots |
| `GET /api/events/:id/eventpulse/accuracy` | Post-event prediction vs actual |
| `GET /api/events/:id/eventpulse/live` | Live engagement signals |
| `POST /api/events/:id/eventpulse/simulate` | What-if simulation (synthetic, labeled) |
| `POST /api/events/:id/eventpulse/query` | Natural-language Q&A over verified metrics |
| `GET /api/admin/eventpulse/accuracy` | Platform model accuracy (admin only) |

## 16. Model versioning (CORE FEATURES 33)

Every persisted prediction, snapshot, alert and outcome stores `modelVersion`
(`eventpulse-v1.0`) and the engine used (`hybrid-gemini` / `hybrid-deterministic` /
`baseline`). Upgrading the algorithms means bumping `config.MODEL_VERSION` — old outcomes
remain attributable to the exact model that produced them.

## 17. Test coverage (CORE FEATURES 50, 51)

`server/tests/eventpulse.test.js` covers: pure math (velocity, attendance, engagement,
health, confidence, drivers, recommendations, simulation, error metrics), REST security
(organizer isolation, admin access, attendee denial), cold start, live events, completed
events, history, and cache behavior. All business logic lives in pure functions —
independently testable without HTTP or MongoDB.

## 18. Known limitations & honest boundaries

* Baseline attendance priors are industry heuristics until an organizer accumulates ≥2
  completed events; the system labels this state explicitly (cold start).
* MAPE requires non-zero actuals; division guards fall back to absolute error.
* The regression layer is statistical (weighted-velocity + surge model), not yet a trained
  supervised model — by design, until sufficient real history exists (see §1 model provider).
* Confidence intervals assume binomial variance around the predicted rate.
* Session-level prediction activates only when session-level attendance data exists.
