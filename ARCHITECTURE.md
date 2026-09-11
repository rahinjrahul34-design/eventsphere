# EventSphere — Project Structure & Architecture

EventSphere is an npm-workspaces monorepo: a React/Vite SPA talking to an
Express + Mongoose API over REST (`/api`) and Socket.IO, all served from a
**single port in production** (Express serves the built SPA from
`server/web-static/` with an SPA fallback).

```
eventsphere/
├── package.json            # workspaces: server + client; root scripts
├── scripts/ensure-env.js   # generates .env on install
├── client/                 # ── React frontend (Vite, ~9,000 LOC)
└── server/                 # ── Node/Express backend (~5,700 LOC)
    └── web-static/         # BUILT SPA (vite outDir; persists; git-ignored normally)
```

---

## 1. Request lifecycle

```
Browser (React)
  │  axios baseURL /api  + JWT (localStorage "es-auth" → zustand persist)
  ▼
Express app.js
  helmet → cors → json → rate limiters → /api routes
  routes → middleware(auth/RBAC/Zod) → controllers
  → services (business logic / external API boundaries)
  → Mongoose models → MongoDB
  controllers always reply with an envelope:
      success : { success:true,  data }
      error   : { success:false, message, errors:[] }
Socket.IO (same HTTP server): JWT handshake → user/event rooms
In production: unmatched non-API GETs → web-static/index.html (SPA)
```

---

## 2. Backend layers (`server/src`)

| Layer | Contents | Responsibility |
|-------|----------|----------------|
| `server.js` | bootstrap | In-memory Mongo (demo) or real `MONGO_URI`, seeds, HTTP + Socket.IO listen |
| `config/` | `index.js`, `db.js` | env config (JWT, Mongo, Razorpay/Cloudinary/Gemini flags), Mongoose connect |
| `routes/` | 18 route files | URL → controller; mount order in `routes/index.js` |
| `middleware/` | `auth.js` `error.js` `rateLimit.js` `validate.js` | `requireAuth`, `requireRole`, `requireApprovedOrganizer`, `optionalAuth`; Zod validation; limiters; envelope error handler |
| `controllers/` | 16 files | HTTP handlers only: auth check, call service/model, `ok/created(res,data)` |
| `services/` | 10 files | Business & 3rd-party logic, each with a **demo-mode fallback** |
| `models/` | 23 Mongoose schemas | Data + indexes |
| `sockets/index.js` | Socket.IO | auth middleware; rooms `user:<id>` / `event:<id>`; realtime chat |
| `seeders/seed.js` | demo data | 127 users, 15 events, ~1100 registrations/tickets, certs… |
| `utils/` | helpers | `ApiError`, response envelope, code/slug generators, badge catalog |

### Service abstractions (mock boundary)
`aiService` (Gemini key → Gemini, else deterministic demo planner),
`paymentService` (Razorpay order/verify, demo capture),
`uploadService` (Cloudinary, demo URL passthrough),
`emailService` (Nodemailer, console/preview in demo),
plus `analyticsService`, `recommendationService`, `gamificationService`,
`networkingService`, `notificationService`, `auditService`.

### 23 models
User, Event, Category, Registration, Waitlist, Ticket, Payment, Session,
Speaker, Sponsor, Volunteer, Announcement, Poll, Question, Message,
Feedback, Certificate, Favorite, Connection, Notification, Report,
AuditLog, Gamification (points/badge ledger).

---

## 3. Realtime (Socket.IO)

Client joins `event:<id>` on live pages; every authenticated socket joins
`user:<id>`. Emitted events:
`notification:new`, `points:awarded`, `badge:awarded`, `dm:message`,
`event:announcement(-removed)`, `event:schedule-update`,
`event:attendance-update`, `event:leaderboard-update`, `event:status`,
`poll:new`, `poll:update`, `qna:new`, `qna:update`, `chat:message`,
`registration:update`.

---

## 4. Frontend layers (`client/src`)

```
main.jsx                QueryClient + Router + theme + Toaster
App.jsx                 all routes, role guards, layouts
store/                  zustand: auth(persist), theme(persist), ui
lib/
  api.js                axios instance + central `endpoints` wrappers
  socket.js             singleton socket.io client
  format.js             dates, INR, categories, interests
  utils.js              cn(), timeAgo, downloads
hooks/useSocket.js      global socket + per-event hook
components/
  ui/                   design system (button card dialog input badge
                        avatar misc(Tabs/Accordion/Dropdown/Switch…)
                        skeleton states)
  layout/               MainLayout(public), DashboardLayout(role-aware
                        sidebar/drawer), Navbar/Footer/MobileBottomNav
  events/               EventCard, filters, calendar, Leaflet MapView,
                        FavoriteButton, ShareMenu, CheckoutDialog
  tickets/TicketPass    boarding-pass QR ticket (canvas download/share)
  certificates/         printable certificate + verify QR
  charts/               Recharts wrappers (area/bar/donut/gauge)
  search/GlobalSearch   Ctrl+K command palette
  notifications/        bell popover + socket toasts
  auth/ProtectedRoute   token + RBAC redirects
pages/
  public+attendee       Landing, Events, EventDetail, LiveEvent,
                        HomeFeed, MyEvents, CalendarPage, MyTickets,
                        TicketDetail, MyCertificates, VerifyCertificate,
                        Notifications, Network, Profile, Onboarding,
                        auth/* (login/register/reset…)
  organizer/            OrganizerHome, EventsList, EventCreate (8-step
    tabs/               wizard + autosave), ManageEvent shell, Copilot,
                        CheckInDesk; tabs: Overview, Analytics,
                        Registrations(waitlist/CSV), CheckIn(html5-qrcode),
                        LiveTab(redirect), Schedule(AI generate),
                        Speakers, Volunteers, Sponsors
  admin/                AdminHome KPIs, AdminApprovals, AdminUsers,
                        AdminModeration, AdminCategories, AdminAudit
  RoleHome.jsx         volunteer assignments / speaker sessions
```

### Data fetching conventions
- **Never hardcode data in components** — everything goes through
  `endpoints.*` in `lib/api.js` (used directly or via TanStack Query).
- Query keys: `['events',params]`, `['event',slug]`, `['live',id]`,
  `['analytics',id]`, `['tickets']`, `['notifications']`, …
- Every data page has loading skeletons/spinner, empty state, error+retry;
  mutations use `sonner` toasts; live pages poll 45 s + socket pushes.

---

## 5. RBAC matrix (high level)

| Capability | attendee | organizer | volunteer | speaker | admin |
|---|:-:|:-:|:-:|:-:|:-:|
| discover / register / tickets / live participation | ✅ | ✅ | ✅ | ✅ | ✅ |
| create/manage events, analytics, AI copilot | – | ✅ | – | – | ✅ |
| QR check-in scan (`/tickets/validate`) | – | own events | assigned events | – | any |
| speaker session view | – | – | – | ✅ | – |
| approvals, users, reports, categories, audit | – | – | – | – | ✅ |

User id is **always derived from the JWT** server-side; ownership checks
compare `event.organizer` / resource owners (admins bypass).

---

## 6. End-to-end lifecycle (code path)

1. **Discover** — `GET /events` filters/search; `/events/recommended`
   (recommendationService scores interests/history/behavior).
2. **Create** — wizard → `POST /events` (draft until approved organizer),
   then speakers/sessions/sponsors resources; admin approval gates public
   visibility; AI Copilot can prefill the whole plan (`POST /ai/plan`).
3. **Register** — `POST /events/:id/register`: capacity → waitlist when
   full, paymentService (demo capture for paid), unique
   (event,user) registration reused on cancel/re-register, QR Ticket
   generated, notification email (demo log).
4. **QR pass** — TicketPass renders code; Google/iCal/share/favorite.
5. **Check-in** — `POST /tickets/validate` is idempotent and returns
   `VALID | DUPLICATE | INVALID | CANCELLED | WRONG_EVENT`; emits
   `event:attendance-update`, awards points.
6. **Live** — `/events/:id/live` aggregates announcements/polls/Q&A/
   chat/current+next session; organizer broadcasts, closes polls, answers.
7. **Analytics** — `eventAnalytics`: cards, daily trend, ticket/source
   distribution, session engagement, rating breakdown, sentiment;
   AI narrative via `/ai/insights/:id`.
8. **Certificates** — organizer issues to checked-in attendees; public
   verify endpoint incl. REVOKED state; print-to-PDF.
9. **Feedback & gamification** — feedback after check-in, sentiment
   scoring, points/badges, event & global leaderboards.
10. **Networking** — suggestions (skill/interest match), connections,
    accepted-connection DMs over REST + `dm:message` sockets.

---

## 7. Security & ops

- JWT (access + refresh where configured), bcrypt password hashing,
  Helmet, CORS allowlist (incl. preview hosts), per-route rate limiters
  (auth + AI), Zod validation, central error envelope, audit log for
  admin/moderation actions, secrets only server-side via env config.
- Demo mode: in-memory MongoDB via mongodb-memory-server (auto-seed);
  set `MONGO_URI` + service keys in `server/.env` for real services.

## 8. Scripts (root)
`npm install` · `npm run build` (Vite → server/web-static) ·
`npm start` (API+SPA :5000) · `npm run dev:server` / `dev:client` ·
`npm run seed` · `npm test` (Jest, server).
