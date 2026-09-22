# BidVector

**India's Procurement Intelligence Platform** -- a self-contained tender
platform with three portals:

- **User / Bidder** -- Command Centre (KPI dashboard), Find Tenders, a
  bid-price recommendation engine with a contestability analysis (eligible vs.
  actual bidders, a competition indicator), My Bids (Kanban), an EMD
  Allocator (capital-constrained bid selection), Tender Alerts, Saved
  Tenders, Competitor intelligence, an OECD-style Collusion Screen, a
  Vendor Network view, Tender Analytics, and an offline Clause Parser.
- **Government** -- one role covering both authoring/evaluating/awarding
  tenders and cross-department oversight: a Dashboard, All Tenders, Under
  Evaluation (with award), system-wide Anomaly Signals, an Investigation
  Queue for the highest-risk cases, a Vendor Registry, and Pending Approvals
  (activating new self-registered accounts -- see Accounts below).
- **Public** -- a transparency view for aggregate/historical data only
  (no private bidder data): Search Tenders, Awards & Results, Price
  Transparency, and Statistics. Reachable by either signed-in role, not its
  own separate account type.

Bidder and Government each sign in through their own tab on `/login`. There's
no separate Public login -- the Public pages are gated behind whichever of
those two accounts you're signed in with, reachable from a "Public Portal"
link in either portal's sidebar.

## Accounts

Self-registration creates a **pending** account -- it can't sign in (email/
password or Google) until an existing Government user approves it from the
Government portal's Pending Approvals page. Seeded demo accounts are
pre-activated. This applies to both bidder and government self-registrations.

It is a self-contained app with its own FastAPI backend, SQLite database,
and React frontend -- no third-party API dependency. The one optional
exception is Google Sign-In (Bidder portal), which calls Google's own
servers to verify a credential when configured; without that configuration
the app makes no external calls at all.

## Architecture

- **Backend**: FastAPI (Python 3.9+), SQLite. The auction-pricing engine,
  EMD knapsack optimiser, eligibility parser and OECD collusion screens
  (`backend/engine/`) are pure-Python, dependency-free statistics code.
- **Frontend**: React + TypeScript, built with Vite, styled with Tailwind
  CSS, data fetching via TanStack Query. The Bidder portal uses a light
  left-sidebar layout, the Government portal a dark-navy one, and the
  Public portal a horizontal top nav -- each visually distinct so the
  active role is recognisable at a glance.
- **Auth**: PBKDF2-SHA256 password hashing + HMAC-signed bearer tokens (one
  week TTL). Set `BIDVECTOR_SECRET` in production. Tokens carry a version
  number checked against the account's current one on every request, so
  logout, password reset and password change all revoke *every*
  outstanding token immediately -- it's sign-out-everywhere, not
  per-device. Password reset links are sent through `backend/mailer.py`,
  which sends real mail via SMTP if `SMTP_HOST` is set, and otherwise logs
  the message (and link) to the server console.
- **CORS** is off by default (the frontend is served by this same app).
  Set `BIDVECTOR_ALLOWED_ORIGINS` (comma-separated) only if serving the
  frontend from a different origin than the API.
- **Google Sign-In** (Bidder portal only) is real, not a demo -- off until
  configured. Set `GOOGLE_CLIENT_ID` in the server's environment; the
  frontend picks it up at runtime from `GET /api/config`, no rebuild
  required. See the SecureBid README this project was adapted from for the
  full Google Cloud Console setup steps -- identical flow here.
- **Export as PDF**: the analysis-heavy pages (EMD Allocator, Tender
  Analytics, Collusion Screen, the Government dashboard, Anomaly Signals,
  and the Public Statistics/Price Transparency pages) have an "Export as
  PDF" button that uses the browser's own print-to-PDF, so there's no
  extra dependency.

## Run locally

```bash
# 1. Backend deps
pip install -r requirements.txt

# 2. Build the frontend
cd frontend
npm install
npm run build
cd ..

# 3. Run (seeds a demo database on first launch)
python run.py
```

Then open `http://localhost:8000`. Demo logins:

| Role       | Email                  | Password  |
|------------|-------------------------|-----------|
| Bidder     | `demo@bidvector.in`      | `demo1234` |
| Government | `gov@bidvector.in`       | `demo1234` |

The Public portal needs a signed-in account (either role) -- open
`/public/tenders` after logging in, or use the "Public Portal" sidebar link.

Options: `python run.py --port 9000`, `--reseed` (wipe and regenerate demo
data), `--seed-only` (build the DB and exit), `--open` (launch a browser).

For frontend-only iteration, run `npm run dev` inside `frontend/` (proxies
`/api` to `http://127.0.0.1:8000` -- start the backend separately with
`python run.py`).

## Deploying

A `Dockerfile` is included (multi-stage: builds the frontend, then runs the
FastAPI app with the built assets baked in):

```bash
docker build -t bidvector .
docker run -p 8000:8000 -e BIDVECTOR_SECRET=<a-long-random-secret> bidvector
```

Set `BIDVECTOR_SECRET` to a long random value and put the app behind HTTPS
before using it with real data. `PORT` is read from the environment if set
(most PaaS platforms set this automatically). The SQLite file lives at
`data/bidvector.db` -- attach a persistent disk at that path on your
hosting platform if you want data to survive redeploys/restarts.

The demo data generator (`backend/seed.py`) is for the runnable demo; a
real deployment would replace it with your actual tender/award ingestion.
