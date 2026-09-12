# AI Command Center — Event Intelligence Operating System

The **AI Command Center** is the unified intelligence orchestration and operational console for EventSphere. It aggregates signals from all six flagship intelligence modules—**EventShield AI**, **EventPulse AI**, **SmartQueue AI**, **TrustSphere**, **EventBoost AI**, and **Recommendation 2.0**—into one cohesive executive cockpit.

---

## 1. Architectural Principles

```
                  +-------------------------------------------------------------+
                  |               Existing Intelligence Modules                 |
                  |                                                             |
                  |  [EventPulse]  [EventShield]  [SmartQueue]  [TrustSphere]   |
                  |          [EventBoost]       [Recommendation 2.0]            |
                  +------------------------------+------------------------------+
                                                 |
                                                 v
                  +-------------------------------------------------------------+
                  |               Command Center Aggregator Layer               |
                  |               (Parallel via Promise.allSettled)             |
                  +------------------------------+------------------------------+
                                                 |
                   +-----------------------------+-----------------------------+
                   |                             |                             |
                   v                             v                             v
        +--------------------+        +--------------------+        +--------------------+
        |  Health Score      |        |  Action Engine     |        |  AI Brief Service  |
        |  Deterministic     |        |  Deduplication &   |        |  Gemini + Local    |
        |  Composite [0-100] |        |  Priority Scoring  |        |  Rule-Based Engine |
        +--------------------+        +--------------------+        +--------------------+
                   |                             |                             |
                   +-----------------------------+-----------------------------+
                                                 |
                                                 v
                  +-------------------------------------------------------------+
                  |               Organizer Command Center UI                   |
                  |  /dashboard/command-center & /dashboard/events/:id/cc       |
                  +-------------------------------------------------------------+
```

### Core Tenets
1. **Orchestration, Not Duplication**: Reuses existing services (`eventPulseEngine`, `eventShieldAlerts`, `smartQueueAnalytics`, `trustProfileService`, `eventBoostEngine`) without duplicating calculations or storing redundant records.
2. **Deterministic Truth**: Authoritative scores (Event Health 0–100, component ratings) are calculated strictly via mathematical rules. The AI is forbidden from fabricating scores or guessing metrics.
3. **Fault-Tolerant Partial Availability**: Uses `Promise.allSettled`. If a module has no data or fails to respond, it is marked as `available: false` with `"Data unavailable"`. The Command Center never crashes or substitutes fake zeroes.
4. **Safety-First Override**: Physical attendee safety supersedes attendance or registration volume. If critical hazards exist, the overall health score is strictly capped at $\le 45$.

---

## 2. Mathematical Formula: Deterministic Event Health Score

$$\text{Health Score} = \sum_{k=1}^{6} (w_k \times S_k)$$

Bounded strictly in $[0, 100]$:

| Dimension | Weight ($w_k$) | Source | Evaluated Measurable Signals |
| :--- | :---: | :--- | :--- |
| **Attendance Health** | $25\%$ | EventPulse | Forecasted turnout vs capacity, registration conversion rate, no-show rate. |
| **Safety Health** | $20\%$ | EventShield | EventShield safety score, operational readiness %, presence of active safety alerts. |
| **Registration Health** | $20\%$ | EventPulse / Event | Total registration volume vs capacity, 24-hour registration velocity. |
| **Queue Health** | $15\%$ | SmartQueue | Queue efficiency score, hold expiration rate, seat claim speed. |
| **SEO & Content Health** | $10\%$ | EventBoost | Content score, description completeness, readability, search intent alignment. |
| **Organizer Trust** | $10\%$ | TrustSphere | Organizer trust score, verified status bonus, dispute/completion history. |

### Critical Safety Override Matrix
If EventShield reports an active **critical** safety alert (e.g. blocked egress, severe capacity overflow $>110\%$, missing emergency contacts for large crowds):
$$\text{Health Score} \le 45 \quad \text{and Status} \in \{\text{'At Risk'}, \text{'Critical'}\}$$
This prevents an organizer from seeing a "Good" or "Excellent" score while life-safety violations remain unmitigated.

### Status Tiers
- **85 – 100**: `Excellent`
- **70 – 84**: `Good`
- **55 – 69**: `Needs Attention`
- **40 – 54**: `At Risk`
- **0 – 39**: `Critical`

---

## 3. Action Center: Prioritization & Deduplication

### Priority Score Formula

$$\text{Priority Score} = (\text{Severity} \times 25) + (\text{Impact} \times 15) + (\text{Urgency} \times 10)$$

Where $\text{Severity}, \text{Impact}, \text{Urgency} \in \{1, 2, 3, 4\}$:
- **$\ge 160$ or Severity = Critical**: `Critical`
- **$110 - 159$**: `High`
- **$70 - 109$**: `Medium`
- **$< 70$**: `Low`

### Deduplication
Actions are deduplicated using composite key:
$$\text{Key} = \text{source} + \text{":"} + \text{sourceId} + \text{":"} + \text{actionType}$$
Guarantees zero duplicate alerts appear in the Action Center.

---

## 4. AI Executive Brief & Zero-Hallucination Policy

The AI service synthesizes structured metrics into:
1. **Current Situation**: Event health, capacity utilization, registration volume.
2. **Positive Signals**: Measurable strengths (readiness, conversion, trust).
3. **Problems & Risks**: Open alerts, waitlist pressure, no-show vulnerabilities.
4. **Top Action**: Highest-priority next operational task with direct link.
5. **Short-Term Outlook**: Forward-looking operational projection.

### Resilient Fallback Architecture
- When `GEMINI_API_KEY` is present and operational: Uses Gemini with temperature 0.2 and strict JSON schema.
- When `GEMINI_API_KEY` is absent or encounters API errors: Automatically delegates to a deterministic local template generator. The UI remains 100% functional.

### Brief Caching (LLM Cost Control)
Executive briefs are cached in memory per event and reused while **(a)** the
10-minute TTL has not expired **and (b)** the structured fact fingerprint is
unchanged (health score/status, top actions, active alert count, registration
volume, waitlist depth, no-show forecast). Any material change to the
underlying intelligence forces regeneration — the dashboard never calls the
LLM on routine refreshes. Cached responses carry `cached: true`.

### Honest Data Availability (No Fabricated Fallbacks)
- Intelligence cards return explicit `available: false` + human-readable `reason`
  when a source module has no data yet; missing metrics are `null`, never
  substituted defaults (no `?? 75`, `?? 50` placeholders).
- The Event Health breakdown flags every dimension computed from a neutral
  baseline (`usedBaseline: true` + `baselineNote`) vs. computed from real module
  data, plus a `dataCompleteness` summary (`availableModules`/`totalModules`).
- `overallHealth.confidence` is `null` unless EventPulse actually reported one
  (`confidenceBasis` documents the source when present).
- Trend timeline points use only recorded snapshot values; absent datapoints are
  `null` (chart gap), never interpolated or filled with constants.
- `freshness.isRealtimeConnected` reflects the real Socket.IO initialization
  state, and action resolution returns `updated: false` when the source system
  does not support resolution (the UI surfaces this honestly).

---

## 5. What-If Scenario Simulator

Accessible via `POST /api/command-center/:eventId/simulate`:
- **Adjustable Parameters**:
  - `registrationDeltaPct` ($\pm \%$ change)
  - `expectedAttendanceRate` ($30\% - 100\%$)
  - `noShowRate` ($0\% - 50\%$)
  - `capacityDelta` (seats added or removed)
  - `safetyReadinessBoost` ($0 - +30$ pts)
  - `seoScoreBoost` ($0 - +30$ pts)
- Computes side-by-side **Before** vs **After** metrics and deltas.
- Explicitly labeled: `"Simulation — Results are calculated using deterministic models and should be treated as guidance, not guaranteed outcomes."`

---

## 6. API Reference & RBAC Security

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/command-center/:eventId` | Complete unified aggregation | Organizer, Admin |
| `GET` | `/api/events/:id/command-center` | Subroute alias for event console | Organizer, Admin |
| `POST` | `/api/command-center/:eventId/simulate` | Run What-If scenario simulation | Organizer, Admin |
| `POST` | `/api/command-center/:eventId/brief` | On-demand AI Executive Brief | Organizer, Admin |
| `PATCH` | `/api/command-center/:eventId/actions/:actionId` | Acknowledge/resolve alert | Organizer, Admin |

### Security Guard:
Attendees and unauthorized users receive `403 Forbidden`. Non-existent events return `404 Not Found`.
