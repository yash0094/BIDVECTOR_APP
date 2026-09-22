"""
SQLite schema and connection handling for BidVector.

Stdlib only. The database is a single file (data/bidvector.db) created on
first run.
"""

import os
import sqlite3
import json
import threading
from contextlib import contextmanager

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.environ.get("BIDVECTOR_DB_PATH", os.path.join(DATA_DIR, "bidvector.db"))

_local = threading.local()


SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    company_name    TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'bidder',   -- bidder | government
    created_at      TEXT NOT NULL,
    token_version   INTEGER NOT NULL DEFAULT 0,
    -- New self-registered accounts start pending until a Government user
    -- approves them; login is refused until status='active'. Seeded demo
    -- accounts are inserted as already-active.
    status          TEXT NOT NULL DEFAULT 'pending'   -- pending | active
);

-- Organisation profile for government accounts.
CREATE TABLE IF NOT EXISTS org_profiles (
    user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    org_name    TEXT NOT NULL DEFAULT '',
    department  TEXT NOT NULL DEFAULT '',
    state       TEXT NOT NULL DEFAULT '',
    designation TEXT NOT NULL DEFAULT ''
);

-- The company profile drives eligibility matching and the cost/capital model.
CREATE TABLE IF NOT EXISTS profiles (
    user_id             INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    udyam_no            TEXT,
    msme_class          TEXT,     -- Micro | Small | Medium
    bidder_class        TEXT,     -- Class I | Class II | Non-local
    turnover_cr         REAL,
    experience_years    REAL,
    max_similar_work_cr REAL,
    certifications      TEXT,     -- JSON list
    states              TEXT,     -- JSON list
    categories          TEXT,     -- JSON list
    working_capital_cr  REAL,
    overhead_pct        REAL,
    target_margin_pct   REAL
);

CREATE TABLE IF NOT EXISTS tenders (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_no            TEXT UNIQUE NOT NULL,
    title             TEXT NOT NULL,
    buyer             TEXT NOT NULL,
    buyer_state       TEXT NOT NULL,
    category          TEXT NOT NULL,
    portal            TEXT NOT NULL,
    estimated_value   REAL NOT NULL,
    emd               REAL NOT NULL,
    tender_fee        REAL NOT NULL,
    published_at      TEXT NOT NULL,
    closes_at         TEXT NOT NULL,
    completion_months INTEGER NOT NULL,
    description       TEXT NOT NULL,
    raw_eligibility   TEXT NOT NULL,
    eligibility_json  TEXT NOT NULL,
    expected_bidders  INTEGER NOT NULL,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status            TEXT NOT NULL DEFAULT 'published'  -- draft | published | closed
);

CREATE INDEX IF NOT EXISTS idx_tenders_cat   ON tenders(category);
CREATE INDEX IF NOT EXISTS idx_tenders_buyer ON tenders(buyer);
CREATE INDEX IF NOT EXISTS idx_tenders_close ON tenders(closes_at);

CREATE TABLE IF NOT EXISTS awards (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_no          TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    buyer           TEXT NOT NULL,
    buyer_state     TEXT NOT NULL,
    category        TEXT NOT NULL,
    estimated_value REAL NOT NULL,
    awarded_at      TEXT NOT NULL,
    n_bidders       INTEGER NOT NULL,
    winner          TEXT NOT NULL,
    winning_bid     REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_awards_bucket ON awards(buyer, category);

CREATE TABLE IF NOT EXISTS bids (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    award_id    INTEGER NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
    bidder      TEXT NOT NULL,
    amount      REAL NOT NULL,
    rank        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bids_award  ON bids(award_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder);

-- Bidder's "My Bids" board: watchlist -> preparing -> submitted -> won/lost.
CREATE TABLE IF NOT EXISTS pipeline (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tender_id   INTEGER NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    status      TEXT NOT NULL,     -- watching|preparing|submitted|won|lost|dropped
    our_bid     REAL,
    cost_est    REAL,
    emd_paid    REAL NOT NULL DEFAULT 0,
    notes       TEXT NOT NULL DEFAULT '',
    updated_at  TEXT NOT NULL,
    UNIQUE(user_id, tender_id)
);

CREATE TABLE IF NOT EXISTS submissions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tender_id       INTEGER NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    bidder_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          REAL NOT NULL,
    status          TEXT NOT NULL DEFAULT 'submitted',  -- submitted|shortlisted|rejected|won|lost
    submitted_at    TEXT NOT NULL,
    UNIQUE(tender_id, bidder_user_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_tender ON submissions(tender_id);

CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tender_id   INTEGER REFERENCES tenders(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,     -- match|deadline|result|screen
    message     TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    read        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, read);

CREATE TABLE IF NOT EXISTS saved_searches (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    params      TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

-- Saved Tenders: a bidder's bookmarked tenders (distinct from the pipeline,
-- which tracks active bid work -- a bookmark is just "watching this").
CREATE TABLE IF NOT EXISTS bookmarks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tender_id   INTEGER NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL,
    UNIQUE(user_id, tender_id)
);
"""


def connect():
    conn = getattr(_local, "conn", None)
    if conn is None:
        os.makedirs(DATA_DIR, exist_ok=True)
        conn = sqlite3.connect(DB_PATH, timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        _local.conn = conn
    return conn


def init_db():
    conn = connect()
    conn.executescript(SCHEMA)
    conn.commit()
    return conn


@contextmanager
def transaction():
    conn = connect()
    conn.execute("BEGIN")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def query(sql, params=()):
    return [dict(r) for r in connect().execute(sql, params).fetchall()]


def query_one(sql, params=()):
    row = connect().execute(sql, params).fetchone()
    return dict(row) if row else None


def execute(sql, params=(), conn=None):
    c = conn or connect()
    cur = c.execute(sql, params)
    if conn is None:
        c.commit()
    return cur.lastrowid


def executemany(sql, seq, conn=None):
    c = conn or connect()
    cur = c.executemany(sql, seq)
    if conn is None:
        c.commit()
    return cur.rowcount


def is_seeded():
    try:
        row = connect().execute("SELECT COUNT(*) AS c FROM tenders").fetchone()
        return row["c"] > 0
    except sqlite3.OperationalError:
        return False


def jloads(s, default=None):
    try:
        return json.loads(s) if s else (default if default is not None else [])
    except (ValueError, TypeError):
        return default if default is not None else []
