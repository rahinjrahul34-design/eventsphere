# 🎟️ EventSphere — Intelligent Event Operating System

A production-style full-stack **MERN** platform covering the complete event
lifecycle: **discover → create → register → pay → QR pass → check-in →
live mode → analytics → certificates → feedback → AI insights**, with
RBAC for **attendee, organizer, volunteer, speaker, admin**, real-time
Socket.IO live events, gamification, networking and an AI event copilot.

- **Frontend:** React 18 · Vite · TailwindCSS · shadcn-style UI kit ·
  Framer Motion · TanStack Query · Recharts · Socket.IO client ·
  Leaflet maps · QR codes · html5-qrcode scanner
- **Backend:** Node.js · Express · MongoDB · Mongoose · JWT · bcrypt ·
  Socket.IO · Nodemailer · Zod · Helmet · CORS · express-rate-limit
- **Optional integrations behind service abstractions (demo fallback):**
  Google Gemini (AI), Razorpay (payments), Cloudinary (uploads),
  Nodemailer SMTP, Google Calendar links
- **Zero-setup demo:** no external MongoDB needed — an in-memory MongoDB
  is downloaded automatically and seeded with rich demo data.

---

## 🚀 Quick start

```bash
# 1. Install (npm workspaces — installs server + client)
npm install

# 2A. One-command demo (builds the React app, then serves API + SPA on :5000)
npm run build
npm start
#    open http://localhost:5000

# 2B. Or development mode (two processes, Vite hot reload on :5173)
npm run dev:server     # API + in-memory Mongo  → http://localhost:5000
npm run dev:client     # Vite dev server (proxies /api + /socket.io) → :5173
```

Re-seed a real/empty database with `npm run seed`.

### Configuration
Copy `server/.env.example` → `server/.env`. All keys are optional; without
them the app runs in **demo mode** (in-memory DB, deterministic AI,
simulated payments/uploads/email). Set `MONGO_URI` for persistence and add
API keys to enable real services.

---

## 🔑 Demo accounts

Password is **`Event@123`** for every account.

| Role | Email | Highlights |
|------|-------|-----------|
| Admin | `admin@eventsphere.demo` | platform KPIs, event approvals, users & organizer applications, reports, categories, audit logs |
| Organizer | `organizer@eventsphere.demo` | 19 events incl. a **LIVE** one; wizard, AI Copilot, analytics, registrations/waitlist, QR desk, schedule/speakers/volunteers/sponsors |
| Attendee | `attendee@eventsphere.demo` | tickets, QR passes, certificates, favorites, connections/DMs, points & badges |
| Volunteer | `volunteer@eventsphere.demo` | assignments + standalone QR check-in desk |
| Speaker | `speaker@eventsphere.demo` | own speaking sessions |

Also seeded: 120 generated attendees, 20 events (hackathons, workshops,
conferences, cultural/sports…), ~1,600 registrations & tickets,
waitlists, polls, Q&A, feedback and certificates. Event covers are
self-hosted (bundled with the app) — covers, speaker avatars and sponsor
logos are all served from `client/public/images/`, so nothing depends on
an external CDN and images never render blank.

> The in-memory database resets on every server restart — data is fresh
> each boot. Use `MONGO_URI` to persist.

---

## 🧭 Try the acceptance flow

1. Log in as **attendee** → browse/Home recommendations → register for an
   event (paid events use the demo payment) → open **My Tickets** QR pass.
2. Log in as **organizer** (second browser/incognito) → open the live
   **Nashik Developer Meetup → Check-in** → scan the attendee QR (or type
   the code) → see VALID / DUPLICATE / WRONG_EVENT states.
3. Open the event's **Live** page → organizer posts an announcement,
   launches a poll, answers a Q&A; attendee sees everything in real time
   and earns points on the leaderboard.
4. Organizer → **AI Copilot** → generate a full event plan from a brief,
   load it into the create wizard; or **AI insights** on a completed event.
5. After the event: issue certificates, attendees verify them at
   `/verify-certificate`, submit feedback (sentiment-scored).
6. **Admin** → approve the pending E-Sports event / organizer application,
   moderate a report, inspect the audit log.
7. Toggle **dark mode**, press **Ctrl/⌘ + K** for global search, try a
   phone-width viewport for the mobile nav.

---

## 🗂️ Architecture

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full map. In short:

```
client/   React SPA (Vite) → axios /api + socket.io
server/   Express routes → middleware (JWT/RBAC/Zod) → controllers
          → services (AI/payment/upload/email w/ demo fallback) → Mongoose
          Socket.IO rooms user:<id> / event:<id>
```

API envelope: success `{ "success": true, "data": {} }`,
error `{ "success": false, "message": "", "errors": [] }`.

### Main endpoint groups (all under `/api`)
`/auth` · `/events` (+ `/mine`, `/recommended`, `/favorites`, `/calendar`,
`/:id/register`, `/registrations/export`) · `/registrations` ·
`/tickets` (`/validate` for check-in) · `/payments/verify` ·
`/events/:id/live`, `/announcements`, `/polls`, `/questions`,
`/events/:id/messages` · `/analytics/events/:id` ·
`/ai/plan`, `/ai/generate`, `/ai/insights/:id` · `/certificates`
(public `/verify/:id`) · `/gamification` (leaderboards) ·
`/networking`, `/messages` · `/notifications` · `/search` ·
speakers/sessions/volunteers/sponsors · `/admin/*`.

### 🧠 AI systems (each with a dedicated doc)
| System | Purpose | Doc |
|---|---|---|
| **EventPulse AI** | Predictive attendance, no-show, engagement & event-health intelligence with confidence, drivers, risk alerts, action center, what-if simulator & NL Q&A | [docs/EVENTPULSE.md](./docs/EVENTPULSE.md) |
| EventShield AI | Operational & crowd-safety risk scoring | — |
| AI Recommendation 2.0 | Personalized event discovery | — |
| AI Event Copilot | Generative planning & insights for organizers | — |
| TrustSphere | Organizer credibility scoring | [docs/TRUSTSPHERE.md](./docs/TRUSTSPHERE.md) |
| Command Center | Unified executive intelligence aggregating the above | [docs/COMMAND_CENTER.md](./docs/COMMAND_CENTER.md) |
| EventBoost / SmartQueue | Listing quality & waitlist conversion | [docs/EVENTBOOST.md](./docs/EVENTBOOST.md) |

### Data models (37)
User, Event, Category, Registration, Waitlist, Ticket, Payment, Session,
Speaker, Sponsor, Volunteer, Announcement, Poll, Question, Message,
Feedback, Certificate, Favorite, Connection, Notification, Report,
AuditLog, Gamification ledger, PasswordReset, SeatHold, SmartQueueAudit,
RecommendationInteraction, EventRiskAssessment, EventRiskAlert,
RiskAssessmentHistory, EventSEOProfile, OrganizerTrustProfile,
OrganizerTrustSnapshot, EventPrediction, EventPredictionSnapshot,
PredictionOutcome, EventPulseAlert.

---

## 🛡️ Security notes
JWT auth + bcrypt; role & ownership checks on every mutation (user id is
always derived from the token, never trusted from the client); Helmet,
CORS allowlist, auth/AI rate limiters, Zod validation, immutable admin
audit log; secrets live only in `server/.env`.

## 🧪 Tests / verification
`npm test` runs the server Jest suite. The repo also includes an
end-to-end API smoke flow (signup → register → QR VALID/DUPLICATE/
WRONG_EVENT/INVALID → RBAC denials → polls/Q&A/announcements → leaderboard
→ certificate verify → admin denial) used during development.

## 📦 Scripts
| Script | Effect |
|---|---|
| `npm install` | install workspaces |
| `npm run build` | Vite build → `server/web-static` |
| `npm start` | serve API + built SPA on port 5000 |
| `npm run dev:server` / `dev:client` | dev processes |
| `npm run seed` | seed a real MongoDB |
| `npm run seed:premium` | rebuild the full premium demo dataset (large interconnected catalog: 400+ users, 60+ events, thousands of registrations/tickets, SmartQueue activity, feedback, payments, notifications) plus recommendations, prediction time series, pulse/risk alerts, SEO profiles, organizer trust reports, polls, Q&A and gamification |
| `npm run seed:verify` | verify the seeded dataset: collection counts, reference integrity, capacity invariants and counter consistency |
| `npm run assets` | regenerate bundled placeholder avatars/logos |
| `npm test` | server tests |

> **Premium demo dataset size is configurable** via environment variables read by
> `server/src/seeders/premiumExpansion.js` — e.g. `PREMIUM_USERS=500 PREMIUM_EVENTS=80 PREMIUM_REGISTRATIONS=5000 npm run seed:premium`.
> On a **fresh demo database** (the default in-memory one), `npm start` builds the premium
> expansion automatically; set `SEED_PREMIUM_ON_START=false` to opt out, or
> `SEED_PREMIUM_ON_START=true` to rebuild it on every boot.
