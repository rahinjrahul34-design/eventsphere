# EventBoost AI — AI Event Description & SEO Optimization Intelligence

EventBoost AI is EventSphere's premium, native SEO and content optimization intelligence engine. It empowers organizers to analyze, optimize, preview, and maximize the search and social discoverability of their events before publishing—combining an objective, deterministic 0–100 scoring engine with verified-fact AI semantic optimization.

---

## 1. Product Vision & Architecture

EventBoost AI transforms EventSphere's event publication workflow:

```
Create Event
     ↓
AI Content Analysis (Deterministic Rules + Semantic NLP)
     ↓
SEO Score (0–100 Objective Engine)
     ↓
Keyword Intelligence (Coverage & Anti-Stuffing Protection)
     ↓
Content Optimization (Verified-Fact Rewriting & Headings)
     ↓
Search Preview (Google SERP Desktop & Mobile)
     ↓
Social Preview (Open Graph & Twitter Cards)
     ↓
Organizer Approval (Side-by-Side Review & Selective Apply)
     ↓
Publish
```

### Core Separation of Concerns:
- **AI Event Copilot** generates event concepts, ticket structures, volunteer lists, and schedules from scratch.
- **EventBoost AI** takes existing event drafts and optimizes their search discoverability, readability, metadata, and structured data.
- **Deterministic SEO Engine** owns the numerical score (0–100). LLMs are never permitted to randomly hallucinate scores.
- **AI Semantic Layer** generates improved titles, structured descriptions, meta tags, and FAQ suggestions strictly from verified event facts.

---

## 2. Deterministic SEO Scoring Formula

The SEO Score is calculated from measurable, deterministic rules across 9 weighted categories:

$$\text{SEO Score} = \sum_{i=1}^{9} \left( \text{Weight}_i \times \text{Category Score}_i \right)$$

Every category score is bounded in $[0, 100]$, and the composite score is integer-rounded:

$$0 \le \text{SEO Score} \le 100$$

The scoring engine guarantees no division-by-zero, `NaN`, or `Infinity`.

### Category Weights & Rules:

| Category | Weight | Key Measurable Criteria |
| :--- | :---: | :--- |
| **Title Optimization** | 15% | • Length: 40–70 chars optimal, <25 penalized, >70 trimmed.<br>• Specificity: multi-word topical focus, penalizes single-word generic titles.<br>• Includes primary keyword or related terms.<br>• Action/format words (Workshop, Summit, Bootcamp, Hands-on). |
| **Description Quality** | 20% | • Length: 300–1500 chars optimal, <150 penalized.<br>• Structure: multi-paragraph layout with headings.<br>• Target audience explicitly defined.<br>• Learning outcomes and key takeaways specified.<br>• Clear registration call-to-action (CTA).<br>• Absence of generic fluff ("amazing event", "learn many things"). |
| **Keyword Relevance & Coverage** | 15% | • Primary keyword targeted.<br>• Occurrence in Title (+20%), Description (+20%), and Tags (+10%).<br>• Secondary keywords coverage (at least 2 covered).<br>• **Anti-Stuffing Protection**: Flagged and score capped if keyword density > 3.5%. |
| **Search Intent Match** | 10% | • Alignment with Informational, Transactional, Educational, and Local search intents.<br>• Evaluates ticket tiers, registration deadlines, and practical deliverables. |
| **Readability** | 10% | • Average sentence length (optimal: 12–20 words).<br>• Ratio of long sentences (>25 words).<br>• Paragraph density.<br>• Adapted Flesch Reading Ease score ($0 \le \text{Score} \le 100$). |
| **Metadata Quality** | 10% | • Meta title presence & length (45–65 characters).<br>• Meta description presence & length (120–160 characters).<br>• Inclusion of call-to-action and primary keyword. |
| **Content Completeness** | 10% | • Start and end dates.<br>• Category classification.<br>• Ticket types / pricing.<br>• FAQs present (at least 2 verified questions).<br>• Attached sessions and speakers. |
| **Local & Mode Relevance** | 5% | • Offline/Hybrid: City and venue address verified.<br>• Online: Virtual platform URL / meeting link verified; no fake physical addresses. |
| **Social Sharing Readiness** | 5% | • High-resolution non-default cover image.<br>• Crisp social snippet / short description (40–160 chars). |

---

## 3. Keyword Extraction & Stuffing Protection

### Extraction Logic:
Keywords are extracted from event title, category, tags, short description, venue city, speaker names, and speaker skills. Candidate bigrams and phrases are scored using weighted term frequency, filtering English stop words.

### Anti-Stuffing Guardrails:
$$\text{Keyword Density} = \frac{\text{Keyword Occurrences} \times \text{Words in Keyword}}{\text{Total Words in Description}}$$

- **Optimal Density**: 0.8% – 2.5%
- **Keyword Stuffing Alert**: Triggered if density exceeds 3.5% or if exact phrases are repeated $\ge 4$ times in short descriptions.
- **Enforcement**: Capped keyword category score ($\le 45$), prominent organizer warning banner, and guidance to use natural synonyms.

---

## 4. AI Semantic Layer & Zero-Hallucination Guardrails

### Zero-Hallucination Policy:
AI suggestions (titles, descriptions, FAQs, meta tags) are strictly constrained to verified event facts:
- Event title, category, eventType (offline, online, hybrid)
- City and venue name
- Ticket tiers and pricing
- Certificate issuance settings
- Attached speakers and session counts

The AI **never invents** guest speakers, certificate guarantees, ticket discounts, sponsors, or false venues. If information is missing, it is noted as missing.

### Provider Resilience & Fallback:
- When Google Gemini API is configured (`GEMINI_API_KEY`), semantic rewriting and conversational Q&A leverage Gemini.
- If Gemini fails, rate-limits, or the API key is omitted, EventBoost automatically engages a local deterministic generator.
- The dashboard informs the organizer non-blockingly: *"AI suggestions running in local rule-based mode."* The dashboard and scoring engine never break.

---

## 5. Schema.org Structured Data & Metadata Implementation

### Public Event SEO Head (`EventSeoHead.jsx`):
Public event pages dynamically inject:
1. `<title>`: `[Meta Title | Title] · EventSphere`
2. `<meta name="description">`: 120–160 character description
3. `<meta name="robots">`:
   - `index, follow` for approved, published, public events.
   - `noindex, nofollow` for draft, private, unlisted, and cancelled events.
4. Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
5. Twitter Cards: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
6. Canonical Link: `<link rel="canonical" href="...">`
7. Schema.org `Event` JSON-LD:
   - `@type`: `"Event"`
   - `eventAttendanceMode`: Offline, Online, or Mixed
   - `location`: `Place` (with `PostalAddress`) or `VirtualLocation`
   - `eventStatus`: Scheduled, Cancelled, or Postponed
   - `offers`: Ticket tiers with price, `priceCurrency: "INR"`, and stock status
   - `organizer`: Organization/Person

### Server-Side SEO Infrastructure (`server/src/routes/seo.routes.js`):
EventSphere is a client-rendered SPA — social scrapers (Facebook, LinkedIn,
WhatsApp, X) and non-JS crawlers do not execute the React bundle, so
client-side injection alone is invisible to them. A root-level router
(mounted **before** the SPA fallback in `app.js`) closes that gap:

1. **`GET /events/:slug` head injection**: the server looks up the event and
   injects `<title>`, meta description, Open Graph, Twitter card, canonical
   link, robots directives, and the same `Event` JSON-LD shape (id
   `eventsphere-schema-jsonld`) directly into the served HTML *before* the
   client bundle loads. The client-side `EventSeoHead` then updates the same
   nodes on hydration — no duplicate tags. All user-generated content is
   HTML-escaped (XSS-safe). Non-public, unapproved, draft and unlisted events
   resolve to **generic tags only** — their details are never rendered into
   crawler-visible markup.
2. **`GET /robots.txt`**: `Allow: /` with disallow rules for authenticated
   areas (`/dashboard/`, `/admin/`, `/my-tickets/`, `/profile/`, `/api/`) and
   a `Sitemap:` reference.
3. **`GET /sitemap.xml`**: static routes plus every publicly indexable event
   (`public` + `approved` + `published|live|completed`), capped at 5,000
   URLs, cached in memory for 15 minutes to avoid per-crawler DB load.

Indexability policy (identical on client and server): only
`visibility: public` + `approvalStatus: approved` + status
`published|live|completed` events emit `index, follow`. Cancelled public
events emit `noindex, nofollow` with `eventStatus: EventCancelled` so search
results are cleaned up without breaking existing links.

---

## 6. API Endpoints & RBAC Security

All EventBoost endpoints require JWT authentication. Modifying SEO requires event ownership or admin role.

| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/events/:id/seo` | Organizer / Admin | Fetches the latest SEO profile and scores. |
| `POST` | `/api/events/:id/seo/analyze` | Organizer / Admin | Refreshes deterministic SEO score and issue checklist. |
| `POST` | `/api/events/:id/seo/optimize` | Organizer / Admin | Generates AI semantic suggestions and recalculates the "After" score. |
| `POST` | `/api/events/:id/seo/apply` | Organizer / Admin | Selectively updates event fields and records audit history. |
| `POST` | `/api/events/:id/seo/copilot` | Organizer / Admin | Conversational Q&A using verified event context. |
| `GET` | `/api/events/:id/seo/history` | Organizer / Admin | Retrieves audit trail of score progressions and changes. |

---

## 7. Database Model: `EventSEOProfile`

Stores SEO intelligence separately from the primary `Event` model to avoid clutter:
- `event`: ObjectId ref Event (unique index)
- `primaryKeyword`: String
- `secondaryKeywords`: [String]
- `seoScore`, `contentScore`, `readabilityScore`, `keywordScore`, `searchIntentScore`, `socialScore`
- `categoryScores`: Sub-scores across 9 dimensions
- `searchIntent`: Primary intent, match percentage, detected intents
- `readabilityMetrics`: Average sentence length, long sentence count, paragraph count, Flesch score
- `keywordCoverage`: Individual keyword checks, densities, and stuffing flags
- `inconsistencies`: Detected contradictions (e.g. online mode vs physical address)
- `seoIssues`: Prioritized issues with impact, effort, reason, and suggested values
- `history`: Timestamped audit log with previous score, new score, and applied changes
- `analysisVersion`: `SEO_V1`

---

## 8. Caching & AI Cost Control

1. **Deterministic-First Execution**: The composite SEO score, readability analysis, and keyword checks run entirely in-process on the Node.js server without invoking paid LLM APIs.
2. **On-Demand Semantic Optimization**: Gemini is called only when the organizer explicitly clicks **[Optimize with AI]** or submits a question to the **SEO Copilot**.
3. **Snapshots**: Computed SEO profiles are persisted in MongoDB. Subsequent page loads read the cached profile rather than re-running AI calls.
4. **Rate Limiting**: AI endpoints are protected with `aiLimiter` to prevent abuse.

---

## 9. Testing & Quality Assurance

EventBoost AI includes a 32+ scenario test suite in `server/tests/eventboost.test.js`:
- Boundary checks ($0 \le \text{Score} \le 100$)
- Idempotency & deterministic score consistency
- Title length, short, and missing title handling
- Description structure and generic fluff detection
- Keyword stuffing detection (> 3.5% density)
- Readability metrics & sentence length checks
- Search intent classification
- Cross-field contradiction detection (mode vs venue, price vs description)
- RBAC authorization (attendees and unrelated organizers rejected with 403)
- AI provider failure resilience and valid JSON fallback
- Before/after optimization simulation
- History tracking and change logging
