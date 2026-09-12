# TrustSphere AI: Organizer Reputation & Trust Intelligence System

## Executive Overview
**TrustSphere AI** is a production-grade organizer reputation and marketplace trust intelligence engine built into the EventSphere platform. It empowers attendees to make informed, confident registration decisions and helps organizers build verified, credible reputations based strictly on **100% verified platform behavior**.

---

## Core Guarantees & Philosophy

1. **Deterministic Scoring Engine**
   - The numerical Trust Score ($0\text{--}100$) is computed strictly via deterministic mathematical formulas.
   - Generative AI (Google Gemini + deterministic fallback) is used exclusively for executive narrative summaries, strength identification, and growth recommendations. AI **never** computes or modifies the numerical score.

2. **Strict Anti-Gaming & Verification**
   - No vanity metrics, no self-proclaimed reviews, no pay-to-win badges.
   - Every input data point requires verified platform telemetry:
     - Event completion vs cancellation.
     - Attendee feedback submitted by registered ticket holders.
     - Actual check-ins recorded via QR or staff scanners.
     - Platform moderation actions confirmed by administrators.

3. **Cold-Start & New Host Protection**
   - Organizers with $<2$ completed events or $<15$ attendees served are assigned `confidenceLevel: "limited"`.
   - UI status: **"Building Trust History"**.
   - Neutral baselines prevent newly registered hosts from being unfairly penalized with artificially low scores while ensuring attendees know their history is emerging.

4. **Bayesian Smoothed Satisfaction**
   - To prevent a single 5-star review from skewing an organizer's score to 100%, attendee satisfaction is smoothed using an Empirical Bayesian Prior:
     $$\text{Smoothed Rating} = \frac{C \cdot m + \sum_{i=1}^N r_i}{C + N}$$
     where prior weight $C = 5$ and platform prior mean $m = 4.0$.

5. **Public Privacy Protection**
   - Public API callers (attendees and non-owners) receive a redacted profile:
     - Private complaint details, open reports, and internal moderation notes are stripped.
     - Only aggregated verified scores, badges, and positive/negative attribution factors are visible publicly.

---

## Scoring Architecture & Component Weights

The composite Trust Score ($0\text{--}100$) is derived from 6 weighted components:

| Component | Weight | Deterministic Formula / Extraction |
| :--- | :---: | :--- |
| **Event Completion & Reliability** | **25%** | $\text{Completion Rate} = \frac{\text{Completed}}{\text{Completed} + \text{Cancelled}} \times 100$. High cancellation rate ($>15\%$) triggers progressive score penalties. |
| **Attendee Satisfaction & Feedback** | **25%** | Bayesian smoothed rating scaled to $0\text{--}100$: $\frac{\text{Rating} - 1.0}{4.0} \times 100$. Derived only from verified attendee post-event feedback. |
| **Attendance & Fulfillment** | **15%** | Ratio of actual check-ins (`checkedInCount`) to total registrations. $80\%+$ fulfillment awards maximum $100$ points. |
| **Compliance & Safety History** | **15%** | Baseline $100$. Deductions occur *only* for confirmed violations resolved by moderators (`fake_event: -30`, `fraud: -35`, `safety_hazard: -25`, `inappropriate: -20`). Dismissed or open reports have 0 penalty. |
| **Verification & Credentials** | **10%** | Approved organizer status ($100$ pts), pending ($50$ pts), unverified ($25$ pts), suspended ($0$ pts). |
| **Experience & Platform Footprint** | **10%** | Host volume scale ($60\%$) + cumulative verified attendees served up to 250 ($40\%$). |

### Recency Time-Decay Weighting
Recent events weigh more heavily than historical events:
- Events within **90 days**: $1.0\times$ weight
- Events within **180 days**: $0.85\times$ weight
- Events within **365 days**: $0.70\times$ weight
- Events **older than 1 year**: $0.50\times$ weight

---

## Trust Level Tiers

| Score Range | Tier Level | Label | Description |
| :---: | :---: | :---: | :--- |
| **90 – 100** | `excellent` | Excellent | Highest tier of platform reliability and verified attendee satisfaction. |
| **80 – 89** | `very_good` | Very Good | Consistently hosts dependable events with strong fulfillment. |
| **70 – 79** | `good` | Good | Dependable host with reliable delivery and positive feedback. |
| **60 – 69** | `fair` | Fair | Moderate reliability; opportunities to improve completion or attendance. |
| **40 – 59** | `needs_improvement` | Needs Improvement | Recent cancellations or satisfaction tracking below platform benchmark. |
| **0 – 39** | `low_trust` | Low Trust | Significant history of cancellations or confirmed moderation issues. |
| *Any (Cold-Start)* | `building_history` | Building Trust History | Host is establishing their verified platform track record ($<2$ events or $<15$ attendees). |

---

## Verified Badges

Earned automatically based on algorithmic thresholds:
- **Verified Organizer**: Platform-vetted and administratively approved.
- **Excellent Organizer**: Trust score $\ge 90$ with medium/high confidence.
- **Highly Reliable**: Completion rate $\ge 95\%$ with 0 cancellations across $\ge 3$ events.
- **Top Rated**: Satisfaction rating $\ge 90\%$ with at least 5 verified reviews.
- **Consistent Host**: Completed $\ge 5$ verified events on EventSphere.

---

## API Reference

Mounted at `/api/trust`:

| Method | Route | Access | Purpose |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/trust/organizers/:organizerId` | Public | Retrieves organizer trust card, component scores, badges, and factors (privacy redacted). |
| `GET` | `/api/trust/organizers/:organizerId/history` | Public | Returns historical trust snapshots for trend sparklines. |
| `GET` | `/api/trust/events/:eventId/organizer` | Public | Quick helper to fetch host reputation for a specific event. |
| `GET` | `/api/trust/me` | Organizer / Admin | Returns authenticated organizer's full trust profile, diagnostic factors, and private metrics. |
| `GET` | `/api/trust/me/ai-insights` | Organizer / Admin | Returns AI executive reputation assessment, strengths, risks, and growth plan. |
| `POST` | `/api/trust/me/simulate` | Organizer / Admin | What-If simulation sandbox: runs isolated in-memory projections without database mutations. |
| `POST` | `/api/trust/me/recalculate` | Organizer / Admin | Triggers full re-extraction and calculation of the organizer's trust profile and records snapshot. |
| `GET` | `/api/trust/admin/analytics` | Admin Only | Platform-wide trust distribution, average score, verified stats, and at-risk organizer radar. |

---

## Database Schemas

1. **`OrganizerTrustProfile` (`server/src/models/OrganizerTrustProfile.js`)**
   - Cached profile record containing `trustScore`, `trustLevel`, `confidenceLevel`, `metrics`, `components`, `weights`, `badges`, `factors`, `aiInsights`, and `lastCalculatedAt`.
   - Automatically invalidated on event completion, cancellation, and new feedback.

2. **`OrganizerTrustSnapshot` (`server/src/models/OrganizerTrustSnapshot.js`)**
   - Historical snapshot collection tracking score evolution, deltas, milestone triggers (`EVENT_COMPLETED`, `EVENT_CANCELLED`, `FEEDBACK_RECEIVED`, `MANUAL_RECALCULATION`), and change reasons.

---

## Frontend Integration

1. **`OrganizerTrustCard.jsx`**
   - Radial SVG gauge indicator with tier-specific color coding.
   - Core 4 verified metrics: Completion %, Satisfaction %, Attendees Served, Safety Record.
   - Badges display and "Trust Breakdown" trigger.
   - Compact mode for event detail sidebar.

2. **`TrustDetailsModal.jsx`**
   - Explains the 6-component methodology and 100% verified activity guarantee.
   - Component progress bars, positive/negative factor tags, and score trajectory history.

3. **`TrustSimulator.jsx`**
   - Interactive sliders for target completion, satisfaction, attendance, and volume.
   - Immediate projected delta (+N pts) with isolated sandbox guarantee.

4. **`TrustTab.jsx`**
   - Command center in Organizer Studio and Event Management.
   - AI Advisor powered by Gemini, factor attributions, simulator, and snapshot history.

5. **`OrganizerPublicProfile.jsx` (`/organizers/:id`)**
   - Host identity hero, verified badges, TrustCard, active upcoming events, and past completed events.

6. **`AdminTrustAnalytics.jsx` (`/admin/trust`)**
   - Platform average score, level distribution bars, flagged/at-risk table, and recalculation audit trail.

---

## Integration Matrix (hardening pass)

### Recalculation triggers (event-driven, all async & non-blocking)

| Trigger | Hook location | Snapshot created? |
|---|---|---|
| `EVENT_COMPLETED` / `EVENT_CANCELLED` | `eventController.setStatus` → TrustSphere async call | Yes (milestone) |
| `FEEDBACK_SUBMITTED` | `feedbackController.submitFeedback` | Only if score changed |
| `REPORT_RESOLVED` / report dismissed | `adminController.resolveReport` (event→organizer, user→organizer mapping) | Yes (milestone) |
| `VERIFICATION_CHANGED` | `adminController.updateUser` (organizerStatus transitions) | Yes (milestone) |
| `MANUAL_RECALCULATION` | `POST /api/trust/me/recalculate` | Only if score changed |
| `SCHEDULED_RECALCULATION` | Cache expiry (1h TTL) on read | Only if score changed |

### Real-time updates

After every recalculation, `trust:updated` is emitted to the organizer's
`user:<id>` Socket.IO room carrying **only non-sensitive metadata**
(`trustScore`, `trustLevel`, `confidenceLevel`, `scoreDelta`, `trigger`,
`scoreVersion`). Moderation details are never broadcast. The client hook
(`useSocket.js`) invalidates the trust query caches and toasts score changes.

### Recommendation 2.0 signal (bounded)

`recommendation/rankingService.applyTrustSignal` applies a **±3-point maximum
nudge** to `matchPercentage` based on the organizer's trust tier
(≥90 → +3, ≥80 → +2, ≥70 → +1, <50 → −3; no profile → zero adjustment so
cold-start organizers are never penalized). Trust can never overpower user
relevance; the match percentage stays clamped to the existing 35–98 band and
the nudge is recorded as an explainable reason entry
(`type: 'trust' | 'trust_risk'`).

### Admin score-band analytics

`GET /api/trust/admin/analytics` returns `scoreBandDistribution` — a `$bucket`
aggregation over `[0,40,60,70,80,90,101]` rendered as numeric bands
(0–39 / 40–59 / 60–69 / 70–79 / 80–89 / 90–100) on the admin dashboard,
complementing the level-based distribution.
