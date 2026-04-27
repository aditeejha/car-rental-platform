# Trustly Cars — Trust-First Offline Car Rental Platform

A production-grade, full-stack reference implementation of a car-rental marketplace
that prioritises **trust**, **offline-first reliability**, **safety**, and an **AI assistant
that explains decisions but never makes them**.

> Live demo flow: browse cars (with real Unsplash imagery from the seeded fleet) →
> book (online or queued offline) → upload pre/post-trip damage evidence →
> the rule engine analyses completeness → the AI assistant narrates, in plain language, what the system found.

---

## Table of contents
1. [What it does](#what-it-does)
2. [Architecture](#architecture)
3. [Repository layout](#repository-layout)
4. [Prerequisites](#prerequisites)
5. [Quick start (clone → run)](#quick-start-clone--run)
6. [Environment variables](#environment-variables)
7. [Demo accounts](#demo-accounts)
8. [API surface](#api-surface)
9. [Trust & damage accountability](#trust--damage-accountability)
10. [Offline-first design](#offline-first-design)
11. [AI Trust Assistant](#ai-trust-assistant)
12. [Dynamic pricing](#dynamic-pricing)
13. [Booking conflict handling](#booking-conflict-handling)
14. [Security & operational notes](#security--operational-notes)
15. [Troubleshooting](#troubleshooting)

---

## What it does

| Pillar | Implementation |
|---|---|
| **Trust & damage accountability** | Pre/post-trip image upload with timestamps, GPS, and SHA-256 hashes. A deterministic rule engine flags missing angles, time-window violations, and inconsistent uploads. |
| **Offline-first** | A Service Worker (`/sw.js`) plus an IndexedDB queue (`offlineQueue.js`). Bookings and image attachments captured offline are stored with a stable `clientRef` and replayed via `POST /api/sync` when connectivity returns. The backend treats `clientRef` as an idempotency key. |
| **Safety-first features** | KYC flag, emergency button (mock alert), trip dashboard with route-share & live-tracking placeholders, per-car safety rating, per-user trust score. |
| **Smart recommendations** | `POST /api/cars/recommend` ranks the fleet by a fit score from budget, passengers, luggage, trip type. |
| **Geo search** | `GET /api/cars?lat=…&lng=…` orders by squared-distance against the seeded `lat/lng`. PostGIS-ready. |
| **Dynamic pricing** | `services/pricing.service.js` computes `price = base · demand · time · scarcity`. A BullMQ repeating job recomputes every 15 min. |
| **Booking conflicts** | Per-car Redis lock + `tstzrange` overlap check inside a transaction with row-level `FOR UPDATE`. `client_ref` is `UNIQUE`, so a retried offline booking is idempotent. |
| **Admin dashboard** | Fleet, users, bookings, top revenue cars, dispute counts. |
| **Wallet** | Top-up, transactions log, used as a refund target. |
| **Notifications** | BullMQ queue persists in-app notifications. |
| **AI Trust Assistant** | Context Builder → Rule Engine → Prompt Generator → LLM → Response Formatter. Falls back to deterministic templates when no API key is set. |

---

## Architecture

```
                ┌──────────────────────────────┐
                │    Next.js 14 (App Router)   │
                │   Tailwind · PWA · IndexedDB │
                │  /api proxy → Express API    │
                └──────────────────────────────┘
                              │  HTTPS (JWT)
                              ▼
                ┌──────────────────────────────┐
                │   Express API (Node.js)      │
                │  routes → controllers →      │
                │  services → db & cache       │
                └──────────────────────────────┘
                  │             │            │
                  ▼             ▼            ▼
              PostgreSQL      Redis        S3 (optional)
              (cars,         (locks,        (trip
              bookings,      rate-limit,   images)
              disputes,      pricing,
              evidence)      BullMQ)
                                │
                                ▼
                        BullMQ Worker
                        (notifications,
                         pricing recompute)
                                │
                                ▼
                          OpenAI / LLM
                        (optional — trust
                         assistant only)
```

### Why this shape
* **Strict layering** — controllers do validation, services hold business rules,
  the DB layer is a thin pool. The AI module is its own subsystem and is
  injected; it never imports from controllers.
* **Stateless API + Redis** — the API can scale horizontally; locks, rate
  limits and the pricing demand counters live in Redis.
* **Offline as a first-class feature** — the client uses a typed action queue
  so any new mutation is added by extending `sync.service.js` and the queue
  enqueuer; no per-feature offline glue code.
* **AI is opt-in & deterministic-by-default** — the rule engine produces the
  *decision*, the LLM only produces the *narration*. If the LLM is down or no
  key is configured, the rule engine still ships an answer.

---

## Repository layout

```
car-rental-platform/
├── backend/
│   ├── migrations/001_init.sql            # full schema
│   └── src/
│       ├── ai/                            # context, rules, prompts, LLM
│       ├── config/                        # env loader
│       ├── controllers/                   # thin HTTP handlers
│       ├── db/                            # pg pool, Redis, migrate, seed
│       ├── middleware/                    # auth, rate-limit, errors
│       ├── routes/                        # /api router
│       ├── services/                      # business logic
│       ├── utils/                         # logger, error helpers
│       ├── workers/                       # BullMQ jobs
│       └── server.js
├── frontend/
│   ├── public/
│   │   ├── manifest.webmanifest           # PWA manifest
│   │   └── sw.js                          # Service Worker
│   └── src/
│       ├── app/                           # Next.js App Router pages
│       ├── components/
│       ├── hooks/
│       ├── lib/                           # api client, IndexedDB queue
│       └── styles/globals.css
└── README.md  ← you are here
```

---

## Prerequisites

You need these installed locally:

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | 18.17+ or 20+ | Both apps run on the same Node. |
| **npm** | 9+ | Or pnpm/yarn — examples use npm. |
| **PostgreSQL** | 14+ | The schema uses `tstzrange` and `uuid-ossp`. |
| **Redis** | 6+ | Needed for locks, rate-limits, BullMQ. |
| **Git** | any | To clone. |

Optional:
* **Docker** — easiest way to get Postgres + Redis (snippet below).
* **AWS S3 bucket** — without it, the API still works in **mock storage mode**.
* **OpenAI API key** — without it, AI replies use the deterministic fallback.

### Spin up Postgres + Redis with Docker (recommended)

```bash
docker run -d --name trustly-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=car_rental \
  -p 5432:5432 postgres:16

docker run -d --name trustly-redis -p 6379:6379 redis:7
```

If you do not want Docker, install Postgres and Redis natively, then:

```sql
CREATE DATABASE car_rental;
```

---

## Quick start (clone → run)

```bash
git clone <your-fork-url> car-rental-platform
cd car-rental-platform
```

### 1) Backend

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL / REDIS_URL / JWT_SECRET
npm install
npm run migrate               # create tables
npm run seed                  # demo users + 6 cars w/ real Unsplash imagery
npm run dev                   # API on http://localhost:4000
```

In a second terminal, start the background worker (notifications + pricing
recompute). The API runs fine without it; the worker is just for repeating
jobs.

```bash
cd backend
npm run worker
```

### 2) Frontend

```bash
cd ../frontend
cp .env.example .env.local    # default points to http://localhost:4000
npm install
npm run dev                   # web app on http://localhost:3000
```

Open <http://localhost:3000>. You should see the home page with hero image,
filters, and the seeded fleet.

### 3) Build for production

```bash
# Backend
cd backend && NODE_ENV=production npm start

# Frontend
cd ../frontend
npm run build
npm run start                 # serves on :3000
```

---

## Environment variables

### `backend/.env`

| Var | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | no | `4000` | Express port |
| `FRONTEND_ORIGIN` | no | `http://localhost:3000` | CORS allow-list |
| `DATABASE_URL` | **yes** | — | `postgres://user:pass@host:5432/db` |
| `REDIS_URL` | no | `redis://localhost:6379` | Locks, rate-limit, BullMQ |
| `JWT_SECRET` | **yes** | — | Sign / verify auth tokens |
| `JWT_EXPIRES_IN` | no | `7d` | Token TTL |
| `AWS_REGION` | no | `us-east-1` | S3 region |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | no | — | If set, server uses real S3 presigning |
| `AWS_S3_BUCKET` | no | — | Empty = **mock storage mode** (placeholder URLs) |
| `OPENAI_API_KEY` | no | — | Empty = deterministic AI fallback |
| `OPENAI_MODEL` | no | `gpt-4o-mini` | Any chat-completions compatible model |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | no | `60000` / `120` | Per-IP limit |

### `frontend/.env.local`

| Var | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |

The frontend uses a Next.js rewrite, so the browser only sees `/api/*` paths.

---

## Demo accounts

Created by `npm run seed`:

| Role  | Email             | Password      |
|-------|-------------------|---------------|
| User  | `demo@user.com`   | `password123` |
| Owner | `demo@owner.com`  | `password123` |
| Admin | `admin@demo.com`  | `password123` |

The renter starts with a ₹50,000 wallet balance.

---

## API surface

All routes are under `/api`. Auth is `Bearer <jwt>`.

### Auth
* `POST /auth/signup` — `{email, password, fullName, phone?, role?}`
* `POST /auth/login` — `{email, password}` → `{token, user}`
* `GET /auth/me`

### Cars
* `GET /cars?city=&category=&maxPrice=&minSeats=&lat=&lng=&limit=&offset=`
* `GET /cars/:id`
* `POST /cars/recommend` — `{budget?, passengers?, luggage?, tripType?, city?}`

### Bookings
* `POST /bookings` — `{carId, startAt, endAt, clientRef?}`
* `GET /bookings/mine`
* `GET /bookings/:id`
* `POST /bookings/:id/cancel`

### Trip evidence
* `POST /images/presign` — `{contentType}` → `{uploadUrl, publicUrl, key}`
* `POST /images/attach` — `{bookingId, phase, angle, imageUrl, capturedAt, lat?, lng?, hash?, meta?}`
* `GET /images/:bookingId`

### Disputes
* `POST /disputes` — `{bookingId, reason, detail?}`
* `GET /disputes/mine`
* `GET /disputes/analyze/:bookingId`

### Offline sync
* `POST /sync` — `{actions:[{clientRef, type, payload}]}`

### AI
* `POST /ai/assist` — `{type, context}` (`damage_guidance` | `offline_guidance`)
* `POST /ai/dispute-explain` — `{bookingId, reason, detail?}`

### Wallet
* `GET /wallet/balance`
* `POST /wallet/topup` — `{amount}` (rupees)

### Admin
* `GET /admin/metrics` (admin role only)

---

## Trust & damage accountability

Every booking expects 5 angles **before** the trip and the same 5 angles **after**:
`front`, `rear`, `left`, `right`, `odometer`.

The deterministic rule engine in `backend/src/ai/rules.js` (called from
`services/dispute.service.js → analyzeBookingEvidence`) checks:

| Code | Trigger |
|---|---|
| `MISSING_PRE_IMAGE`  | A required pre-trip angle is absent. |
| `MISSING_POST_IMAGE` | A required post-trip angle is absent. |
| `PRE_AFTER_START`    | A pre-trip image was captured after the booking start. |
| `POST_OUT_OF_WINDOW` | A post-trip image was captured outside the trip window (with a 6h grace). |

When a user files a dispute, the system computes the issue list **first**,
then asks the AI to narrate it neutrally. The AI never decides the outcome.

---

## Offline-first design

The frontend treats the network as optional:

1. The **Service Worker** (`/public/sw.js`) caches the app shell and
   network-first proxies `/api`.
2. The **IndexedDB queue** (`/src/lib/offlineQueue.js`) stores typed actions:
   * `booking.create`
   * `image.attach`
   Each action carries a stable `clientRef` (UUID).
3. On `online` events (or when the SW broadcasts `sync-now`), the queue is
   flushed via `POST /api/sync`.
4. The backend **idempotently** processes every action by `client_ref`. The
   `bookings.client_ref` column is `UNIQUE`. The `sync_log` table is the audit
   trail of every replay attempt with `accepted | conflict | rejected`.
5. **Conflict resolution**: two devices booking the same car for overlapping
   dates — the second one fails with `409 CONFLICT`, the action is logged with
   `result='conflict'`, and the user gets an AI-narrated explanation.

To test it manually:
1. Open DevTools → Application → Service Workers, check **Offline**.
2. Book a car. You'll see "Offline — booking queued."
3. Uncheck **Offline**. Watch the toaster announce "Synced 1 queued action."

---

## AI Trust Assistant

The architecture mandated by the spec, implemented in `backend/src/ai/`:

```
┌─ Context Builder ─┐  ┌─ Rule Engine ─┐  ┌─ Prompt Generator ─┐  ┌─ LLM ─┐  ┌─ Formatter ─┐
│ trip data,        │→│ deterministic  │→│ ROLE / CONTEXT /   │→│ OpenAI │→│ {message,    │
│ images, issues    │ │ decision       │ │ TASK / CONSTRAINTS │ │ chat   │ │  next_step}  │
└───────────────────┘ └────────────────┘ └────────────────────┘ └────────┘ └──────────────┘
```

* **Context Builder**: services pass already-validated structured objects
  (booking, issue list, completeness) to the AI module — no string scraping.
* **Rule Engine** (`ai/rules.js`): turns structured data into a normative
  decision (`nextStep`), which is what the UI actually uses.
* **Prompt Template** (`ai/prompts.js`): the canonical
  `ROLE / CONTEXT / TASK / CONSTRAINTS` block.
* **LLM** (`ai/index.js`): only invoked if `OPENAI_API_KEY` is set; failures
  are caught and the deterministic fallback is returned.
* **Formatter**: every endpoint returns `{message, next_step, ...}` so the UI
  can branch on `next_step` (e.g. `capture_more_angles`, `start_trip`).

---

## Dynamic pricing

`current_price = base_price · timeFactor · demandFactor · scarcityFactor`

| Factor | Source | Range |
|---|---|---|
| `timeFactor`     | weekend / morning / evening peaks | 0.9 – 1.4 |
| `demandFactor`   | sliding 30-min counter of city searches in Redis | 1.0 – 1.25 |
| `scarcityFactor` | available cars in city                          | 1.0 – 1.20 |

The recompute is triggered by:
* a BullMQ repeating job every 15 min (run via `npm run worker`);
* and ad-hoc on a successful search (the demand counter increments).

---

## Booking conflict handling

`services/booking.service.js → createBooking` does, in order:

1. **Idempotency** — if a `client_ref` already exists, return the prior
   booking unchanged.
2. **Redis lock** (`SET NX PX 5000`) on `lock:car:<id>`.
3. **Transaction** with `SELECT … FOR UPDATE` on the car row.
4. **Overlap check** using PostgreSQL's
   `tstzrange(start,end,'[)') && tstzrange(req_start, req_end, '[)')`.
5. **Insert** with `client_ref` as the unique key.
6. **Lua-safe lock release** so we never delete somebody else's lock.

This is intentionally belt-and-braces because offline replays can race with
real-time bookings.

---

## Security & operational notes

* **Helmet** + **CORS allow-list** + **per-IP rate limit** backed by Redis.
* **Joi schemas** at every controller — no DB call gets unvalidated input.
* **Bearer JWT** with role gating (`requireRole('admin')` for the admin API).
* **No secrets in client** — all third-party calls go through the API.
* **Image uploads** use S3 presigned URLs, so binary blobs never traverse the
  app server. If S3 is not configured, the API switches to a mock provider so
  the rest of the system still works.
* **Logging**: `pino` JSON logs in production, pretty in dev. `morgan` for
  HTTP access. Errors with stack are logged but never returned to the client.
* **Migrations**: SQL files in `backend/migrations`, applied in lexical order
  by `npm run migrate`. Add `002_*.sql`, `003_*.sql`, etc.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `relation "users" does not exist` on first run | You skipped `npm run migrate`. |
| `ECONNREFUSED 127.0.0.1:5432` | Postgres is not running, or `DATABASE_URL` is wrong. |
| `ECONNREFUSED 127.0.0.1:6379` | Redis is not running. The API will still boot but rate-limiting and pricing will fail. |
| Frontend cars don't load | Confirm the backend is up at `http://localhost:4000/api/cars`. The frontend proxies `/api/*` via `next.config.js`. |
| Login error "Invalid credentials" | Re-run `npm run seed`. |
| Service Worker stale after edits | DevTools → Application → Service Workers → **Update** + **Skip waiting**. |
| `OpenAI` 401 errors in logs | Either set `OPENAI_API_KEY` or leave it empty to use the deterministic fallback. |
| Images fail to load with `next/image` | The hostname is allow-listed in `next.config.js → images.remotePatterns`. Add new hostnames there. |
| Booking returns `409 CONFLICT` | Another booking already occupies those dates, or two clients raced — pick a different window. |

---

### Final notes

This codebase is intentionally **modular but not over-engineered**. Every file
maps to one of the spec's pillars (trust, offline, safety, AI, pricing,
conflicts, admin, wallet, notifications). Read it top-down: `routes/` →
`controllers/` → `services/` → `db/`, with `ai/` as its own self-contained
subsystem.

The seeded UI uses real Unsplash car imagery so a fresh clone produces a demo
that already looks like a product, not a wireframe. Replace the seed images
with your own (or wire up the S3 upload flow) and you have a working
foundation to build a real marketplace on.

— Happy hacking.
