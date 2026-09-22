"""
Bidder / Contractor portal.

    GET  /api/bidder/dashboard              Command Centre: KPIs + ranked opportunities
    GET  /api/bidder/analytics              Tender Analytics
    GET  /api/filters                       facet values for the filter bar
    GET  /api/tenders                       Find Tenders search
    GET  /api/tenders/{id}                  detail + contestability analysis
    POST /api/parse                         Clause Parser
    GET  /api/bidder/pipeline               My Bids
    POST /api/bidder/pipeline               add/update a bid
    DELETE /api/bidder/pipeline/{id}
    POST /api/bidder/portfolio/optimise     EMD Allocator
    GET  /api/bidder/alerts                 Tender Alerts feed
    POST /api/bidder/alerts/{id}/read
    GET/POST/DELETE /api/bidder/saved-searches
    GET/POST/DELETE /api/bidder/bookmarks   Saved Tenders
    GET  /api/bidder/competitors            Competitors
    GET  /api/bidder/competitors/{name}
    GET  /api/bidder/screens                Collusion Screen (scoped)
    GET  /api/bidder/screens/ranked
    GET  /api/bidder/vendor-network         Vendor Network
    POST /api/bidder/pricing/recommend      bid-price recommendation
    POST /api/bidder/pricing/evaluate       what-if on a typed bid
"""

import json
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request

from .. import db
from ..deps import current_user, current_user_optional, require_role
from ..engine import pricing, eligibility, portfolio, cartel, stats as st
from ..helpers import TODAY, get_profile, tender_public

bidder_router = APIRouter(tags=["bidder"], dependencies=[Depends(require_role("bidder"))])
# Tender search/detail/clause-parser stay reachable without login too (a
# visitor can browse before creating an account), but personalise when signed
# in as a bidder -- so this second router has no role dependency.
open_router = APIRouter(tags=["tenders"])


# --------------------------------------------------------------- dashboard

@bidder_router.get("/api/bidder/dashboard")
def dashboard(request: Request, user=Depends(current_user)):
    profile = get_profile(user["id"])
    cost_ratio = float(request.query_params.get("cost_ratio", 0.82))

    pipe = db.query("""
        SELECT p.*, t.title,t.buyer,t.category,t.estimated_value,t.emd,t.closes_at
        FROM pipeline p JOIN tenders t ON t.id=p.tender_id
        WHERE p.user_id=?""", (user["id"],))

    emd_locked = sum(p["emd_paid"] or 0 for p in pipe if p["status"] == "submitted")
    capital = (profile.get("working_capital_cr") or 0) * 10_000_000

    live_ev = 0.0
    for p in pipe:
        if p["status"] != "submitted" or not p["our_bid"]:
            continue
        ev = pricing.evaluate_bid(p["buyer"], p["category"], p["estimated_value"],
                                  p["cost_est"] or p["estimated_value"] * cost_ratio,
                                  p["our_bid"])
        live_ev += ev["expected_profit"]

    decided = [p for p in pipe if p["status"] in ("won", "lost")]
    win_rate = (sum(1 for p in decided if p["status"] == "won") / len(decided)
                if decided else None)

    rows = db.query("""
        SELECT * FROM tenders
        WHERE status='published' AND julianday(closes_at) >= julianday(?)
        ORDER BY closes_at LIMIT 120""", (TODAY.isoformat(),))
    opportunities, screened_out = [], 0
    for r in rows:
        t = tender_public(r)
        m = eligibility.match(profile, t["eligibility"], t)
        if m["verdict"] == "not_eligible":
            screened_out += 1
            continue
        score = pricing.quick_score(t["buyer"], t["category"], t["estimated_value"], cost_ratio)
        if not score:
            continue
        opportunities.append({
            "id": t["id"], "title": t["title"], "buyer": t["buyer"],
            "category": t["category"], "estimated_value": t["estimated_value"],
            "emd": t["emd"], "closes_at": t["closes_at"], "days_left": t["days_left"],
            "match": m["verdict"], "match_score": m["score"], "gaps": len(m["blockers"]),
            **score,
        })
    opportunities.sort(key=lambda o: -o["expected_profit"])

    alerts = db.query("""SELECT * FROM alerts WHERE user_id=?
                         ORDER BY read ASC, created_at DESC LIMIT 5""", (user["id"],))

    return {
        "company": user["company_name"],
        "metrics": {
            "emd_locked": emd_locked, "working_capital": capital,
            "capital_utilisation": (emd_locked / capital) if capital else 0,
            "expected_value_live": live_ev, "win_rate": win_rate,
            "decided_count": len(decided),
            "active_bids": sum(1 for p in pipe if p["status"] in ("preparing", "submitted")),
            "screened_out": screened_out, "hours_saved": round(screened_out * 1.3),
        },
        "opportunities": opportunities[:15],
        "closing_soon": sorted(
            [p for p in pipe if p["status"] in ("preparing", "watching")],
            key=lambda p: p["closes_at"])[:5],
        "recent_alerts": alerts,
    }


@bidder_router.get("/api/bidder/analytics")
def analytics(user=Depends(current_user)):
    profile = get_profile(user["id"])
    capital = (profile.get("working_capital_cr") or 0) * 10_000_000

    pipe = db.query("""
        SELECT p.*, t.category, t.buyer_state, t.estimated_value
        FROM pipeline p JOIN tenders t ON t.id=p.tender_id
        WHERE p.user_id=?""", (user["id"],))

    emd_deployed = sum(p["emd_paid"] or 0 for p in pipe if p["status"] in ("submitted", "won"))

    by_category = defaultdict(lambda: {"bids": 0, "won": 0, "value": 0.0})
    for p in pipe:
        c = by_category[p["category"]]
        if p["status"] in ("submitted", "won", "lost"):
            c["bids"] += 1
        if p["status"] == "won":
            c["won"] += 1
            c["value"] += p["estimated_value"] or 0
    categories = [{"category": k, "win_rate": (v["won"] / v["bids"] if v["bids"] else 0), **v}
                  for k, v in sorted(by_category.items(), key=lambda kv: -kv[1]["value"])]

    decided = [p for p in pipe if p["status"] in ("won", "lost")]
    return {
        "tenders_monitored": db.query_one(
            "SELECT COUNT(*) AS c FROM tenders WHERE status='published'")["c"],
        "bids_submitted": sum(1 for p in pipe if p["status"] in ("submitted", "won", "lost")),
        "total_won": sum(1 for p in decided if p["status"] == "won"),
        "hit_rate": (sum(1 for p in decided if p["status"] == "won") / len(decided)
                    if decided else 0),
        "capital": {
            "working_capital": capital, "deployed": emd_deployed,
            "available": max(capital - emd_deployed, 0),
            "utilisation": (emd_deployed / capital) if capital else 0,
        },
        "win_rate_by_category": categories,
    }


# ------------------------------------------------------------ find tenders

@open_router.get("/api/filters")
def filters():
    return {
        "buyers": [r["buyer"] for r in db.query(
            "SELECT DISTINCT buyer FROM tenders WHERE status='published' ORDER BY buyer")],
        "categories": [r["category"] for r in db.query(
            "SELECT DISTINCT category FROM tenders WHERE status='published' ORDER BY category")],
        "states": [r["buyer_state"] for r in db.query(
            "SELECT DISTINCT buyer_state FROM tenders WHERE status='published' ORDER BY buyer_state")],
        "portals": [r["portal"] for r in db.query(
            "SELECT DISTINCT portal FROM tenders WHERE status='published' ORDER BY portal")],
    }


def _qarg(request, name, default=None, cast=None):
    v = request.query_params.get(name)
    if v is None or v == "":
        return default
    if cast:
        try:
            return cast(v)
        except (ValueError, TypeError):
            return default
    return v


@open_router.get("/api/tenders")
def search_tenders(request: Request, user=Depends(current_user_optional)):
    profile = get_profile(user["id"]) if user and user["role"] == "bidder" else {}
    where, params = ["status='published'"], []
    q = _qarg(request, "q")
    if q:
        where.append("(LOWER(title) LIKE ? OR LOWER(buyer) LIKE ? OR LOWER(ref_no) LIKE ?)")
        like = f"%{q.lower()}%"
        params += [like, like, like]
    for field, arg in (("buyer", "buyer"), ("category", "category"),
                       ("buyer_state", "state"), ("portal", "portal")):
        v = _qarg(request, arg)
        if v:
            where.append(f"{field}=?"); params.append(v)
    mn = _qarg(request, "min_value", cast=float)
    mx = _qarg(request, "max_value", cast=float)
    if mn:
        where.append("estimated_value >= ?"); params.append(mn)
    if mx:
        where.append("estimated_value <= ?"); params.append(mx)
    if _qarg(request, "open_only", "1") == "1":
        where.append("julianday(closes_at) >= julianday(?)"); params.append(TODAY.isoformat())

    rows = db.query(f"SELECT * FROM tenders WHERE {' AND '.join(where)} ORDER BY closes_at",
                    params)
    eligible_only = _qarg(request, "eligible_only") == "1"
    out = []
    for r in rows:
        t = tender_public(r)
        if profile:
            t["match"] = eligibility.match(profile, t["eligibility"], t)
            if eligible_only and t["match"]["verdict"] == "not_eligible":
                continue
        # Contestability indicator: how many bidders have actually shown up
        # historically for this buyer+category vs. how many the buyer expected.
        actual = db.query_one("""
            SELECT AVG(n_bidders) AS n FROM awards WHERE buyer=? AND category=?""",
            (t["buyer"], t["category"]))["n"]
        t["contestability"] = {
            "expected_bidders": t["expected_bidders"],
            "actual_avg_bidders": round(actual, 1) if actual else None,
        }
        out.append(t)

    page = _qarg(request, "page", 1, int)
    size = min(_qarg(request, "page_size", 20, int), 100)
    start = (page - 1) * size
    return {"total": len(out), "page": page, "page_size": size, "results": out[start:start + size]}


@open_router.get("/api/tenders/{tender_id}")
def tender_detail(tender_id: int, user=Depends(current_user_optional)):
    row = db.query_one("SELECT * FROM tenders WHERE id=?", (tender_id,))
    if not row:
        raise HTTPException(404, "Tender not found")
    t = tender_public(row)

    if user and user["role"] == "bidder":
        profile = get_profile(user["id"])
        t["match"] = eligibility.match(profile, t["eligibility"], t)
        t["checklist"] = eligibility.document_checklist(t["eligibility"], profile)
        t["pipeline"] = db.query_one(
            "SELECT * FROM pipeline WHERE user_id=? AND tender_id=?", (user["id"], tender_id))
        t["bookmarked"] = bool(db.query_one(
            "SELECT id FROM bookmarks WHERE user_id=? AND tender_id=?",
            (user["id"], tender_id)))

    comparables = db.query("""
        SELECT ref_no,title,awarded_at,estimated_value,winning_bid,n_bidders,winner,
               winning_bid*1.0/estimated_value AS l1_ratio
        FROM awards WHERE buyer=? AND category=?
        ORDER BY awarded_at DESC LIMIT 8""", (t["buyer"], t["category"]))
    t["comparables"] = comparables

    # Contestability analysis: eligible vs actual bidder counts, a simple
    # 0-100 competition indicator from historical turnout for this bucket.
    hist = db.query("SELECT n_bidders FROM awards WHERE buyer=? AND category=?",
                    (t["buyer"], t["category"]))
    avg_actual = (sum(h["n_bidders"] for h in hist) / len(hist)) if hist else None
    competition_indicator = None
    if avg_actual is not None and t["expected_bidders"]:
        competition_indicator = round(
            min(100, 100 * avg_actual / max(t["expected_bidders"], 1)))
    t["contestability"] = {
        "expected_bidders": t["expected_bidders"],
        "actual_avg_bidders": round(avg_actual, 1) if avg_actual is not None else None,
        "competition_indicator": competition_indicator,
    }
    return t


@open_router.post("/api/parse")
def parse_clause(body: dict, user=Depends(current_user_optional)):
    text = body.get("text")
    if not text:
        raise HTTPException(400, "Missing required field: text")
    parsed = eligibility.parse_eligibility(text)
    out = {"parsed": parsed}
    if user and user["role"] == "bidder":
        out["match"] = eligibility.match(get_profile(user["id"]), parsed)
    return out


# -------------------------------------------------------------- my bids

STATUSES = ("watching", "preparing", "submitted", "won", "lost", "dropped")


@bidder_router.get("/api/bidder/pipeline")
def list_pipeline(user=Depends(current_user)):
    rows = db.query("""
        SELECT p.*, t.title, t.buyer, t.category, t.estimated_value, t.emd,
               t.closes_at, t.ref_no
        FROM pipeline p JOIN tenders t ON t.id = p.tender_id
        WHERE p.user_id=? ORDER BY t.closes_at""", (user["id"],))
    for r in rows:
        from ..helpers import days_left
        r["days_left"] = days_left(r["closes_at"])
        if r.get("our_bid") and r.get("cost_est"):
            r["margin"] = r["our_bid"] - r["cost_est"]
    return {"pipeline": rows}


@bidder_router.post("/api/bidder/pipeline")
def upsert_pipeline(body: dict, user=Depends(current_user)):
    tid = body.get("tender_id")
    if not tid:
        raise HTTPException(400, "Missing required field: tender_id")
    tid = int(tid)
    status = body.get("status", "watching")
    if status not in STATUSES:
        raise HTTPException(400, "Unknown status")
    if not db.query_one("SELECT id FROM tenders WHERE id=?", (tid,)):
        raise HTTPException(404, "Tender not found")

    existing = db.query_one("SELECT * FROM pipeline WHERE user_id=? AND tender_id=?",
                            (user["id"], tid))
    fields = {
        "status": status,
        "our_bid": body.get("our_bid", existing["our_bid"] if existing else None),
        "cost_est": body.get("cost_est", existing["cost_est"] if existing else None),
        "emd_paid": body.get("emd_paid", existing["emd_paid"] if existing else 0) or 0,
        "notes": body.get("notes", existing["notes"] if existing else ""),
        "updated_at": TODAY.isoformat(),
    }
    if existing:
        db.execute("""UPDATE pipeline SET status=?,our_bid=?,cost_est=?,emd_paid=?,
                      notes=?,updated_at=? WHERE id=?""",
                   (fields["status"], fields["our_bid"], fields["cost_est"],
                    fields["emd_paid"], fields["notes"], fields["updated_at"], existing["id"]))
        pid = existing["id"]
    else:
        pid = db.execute("""INSERT INTO pipeline
            (user_id,tender_id,status,our_bid,cost_est,emd_paid,notes,updated_at)
            VALUES (?,?,?,?,?,?,?,?)""",
            (user["id"], tid, fields["status"], fields["our_bid"], fields["cost_est"],
             fields["emd_paid"], fields["notes"], fields["updated_at"]))

    if status == "submitted" and fields["our_bid"]:
        db.execute("""
            INSERT INTO submissions (tender_id,bidder_user_id,amount,status,submitted_at)
            VALUES (?,?,?,'submitted',?)
            ON CONFLICT(tender_id,bidder_user_id)
            DO UPDATE SET amount=excluded.amount, submitted_at=excluded.submitted_at""",
            (tid, user["id"], fields["our_bid"], TODAY.isoformat()))

    return {"id": pid, **fields}


@bidder_router.delete("/api/bidder/pipeline/{pid}")
def delete_pipeline(pid: int, user=Depends(current_user)):
    db.execute("DELETE FROM pipeline WHERE id=? AND user_id=?", (pid, user["id"]))
    return {"deleted": pid}


# ------------------------------------------------------------ EMD allocator

@bidder_router.post("/api/bidder/portfolio/optimise")
def optimise_portfolio(body: dict, user=Depends(current_user)):
    profile = get_profile(user["id"])
    capital = body.get("capital")
    capital = float(capital) if capital is not None else (
        profile.get("working_capital_cr") or 0.25) * 10_000_000
    max_bids = int(body.get("max_bids", 6))
    cost_ratio = float(body.get("cost_ratio", 0.82))
    horizon = int(body.get("horizon_days", 45))
    eligible_only = bool(body.get("eligible_only", True))

    rows = db.query("""
        SELECT * FROM tenders
        WHERE status='published' AND julianday(closes_at) >= julianday(?)
          AND julianday(closes_at) - julianday(?) <= ?
        ORDER BY closes_at""", (TODAY.isoformat(), TODAY.isoformat(), horizon))

    candidates = []
    for r in rows:
        t = tender_public(r)
        if eligible_only and profile:
            m = eligibility.match(profile, t["eligibility"], t)
            if m["verdict"] == "not_eligible":
                continue
        score = pricing.quick_score(t["buyer"], t["category"], t["estimated_value"], cost_ratio)
        if not score or score["expected_profit"] <= 0:
            continue
        candidates.append({
            "id": t["id"], "title": t["title"], "buyer": t["buyer"],
            "closes_at": t["closes_at"], "emd": t["emd"],
            "estimated_value": t["estimated_value"],
            "recommended_bid": score["bid"], "win_prob": score["win_prob"],
            "expected_profit": score["expected_profit"],
        })

    candidates.sort(key=lambda c: -(c["expected_profit"] / c["emd"] if c["emd"] else 1e18))
    result = portfolio.optimise(candidates[:40], capital, max_bids)
    result["considered"] = len(candidates)
    return result


# ---------------------------------------------------------------- alerts

@bidder_router.get("/api/bidder/alerts")
def list_alerts(user=Depends(current_user)):
    rows = db.query("""SELECT * FROM alerts WHERE user_id=?
                       ORDER BY read ASC, created_at DESC LIMIT 50""", (user["id"],))
    return {"alerts": rows, "unread": sum(1 for r in rows if not r["read"])}


@bidder_router.post("/api/bidder/alerts/{aid}/read")
def read_alert(aid: int, user=Depends(current_user)):
    db.execute("UPDATE alerts SET read=1 WHERE id=? AND user_id=?", (aid, user["id"]))
    return {"ok": True}


@bidder_router.get("/api/bidder/saved-searches")
def list_saved_searches(user=Depends(current_user)):
    rows = db.query("SELECT * FROM saved_searches WHERE user_id=? ORDER BY created_at DESC",
                    (user["id"],))
    for r in rows:
        r["params"] = db.jloads(r["params"], {})
    return {"saved_searches": rows}


@bidder_router.post("/api/bidder/saved-searches", status_code=201)
def create_saved_search(body: dict, user=Depends(current_user)):
    name = body.get("name")
    if not name:
        raise HTTPException(400, "Missing required field: name")
    params = body.get("params") or {}
    sid = db.execute(
        "INSERT INTO saved_searches (user_id,name,params,created_at) VALUES (?,?,?,?)",
        (user["id"], name, json.dumps(params), TODAY.isoformat()))
    return {"id": sid, "name": name, "params": params}


@bidder_router.delete("/api/bidder/saved-searches/{sid}")
def delete_saved_search(sid: int, user=Depends(current_user)):
    db.execute("DELETE FROM saved_searches WHERE id=? AND user_id=?", (sid, user["id"]))
    return {"deleted": sid}


# ------------------------------------------------------------ saved tenders

@bidder_router.get("/api/bidder/bookmarks")
def list_bookmarks(user=Depends(current_user)):
    rows = db.query("""
        SELECT b.id AS bookmark_id, b.created_at AS bookmarked_at, t.*
        FROM bookmarks b JOIN tenders t ON t.id = b.tender_id
        WHERE b.user_id=? ORDER BY b.created_at DESC""", (user["id"],))
    return {"bookmarks": [
        {"bookmark_id": r["bookmark_id"], "bookmarked_at": r["bookmarked_at"],
         **tender_public({k: v for k, v in r.items()
                          if k not in ("bookmark_id", "bookmarked_at")})}
        for r in rows]}


@bidder_router.post("/api/bidder/bookmarks", status_code=201)
def add_bookmark(body: dict, user=Depends(current_user)):
    tid = body.get("tender_id")
    if not tid:
        raise HTTPException(400, "Missing required field: tender_id")
    if not db.query_one("SELECT id FROM tenders WHERE id=?", (tid,)):
        raise HTTPException(404, "Tender not found")
    db.execute("""INSERT INTO bookmarks (user_id,tender_id,created_at) VALUES (?,?,?)
                 ON CONFLICT(user_id,tender_id) DO NOTHING""",
              (user["id"], tid, TODAY.isoformat()))
    return {"ok": True}


@bidder_router.delete("/api/bidder/bookmarks/{tender_id}")
def remove_bookmark(tender_id: int, user=Depends(current_user)):
    db.execute("DELETE FROM bookmarks WHERE user_id=? AND tender_id=?", (user["id"], tender_id))
    return {"ok": True}


# ----------------------------------------------------------- market intel

@bidder_router.get("/api/bidder/competitors")
def competitors(request: Request):
    where, params = ["1=1"], []
    buyer = request.query_params.get("buyer")
    category = request.query_params.get("category")
    if buyer:
        where.append("a.buyer=?"); params.append(buyer)
    if category:
        where.append("a.category=?"); params.append(category)
    rows = db.query(f"""
        SELECT b.bidder,
               COUNT(*) AS bids,
               SUM(CASE WHEN b.rank=1 THEN 1 ELSE 0 END) AS wins,
               AVG(b.amount*1.0/a.estimated_value) AS avg_ratio,
               MIN(b.amount*1.0/a.estimated_value) AS min_ratio,
               SUM(CASE WHEN b.rank=1 THEN a.estimated_value ELSE 0 END) AS won_value
        FROM bids b JOIN awards a ON a.id=b.award_id
        WHERE {' AND '.join(where)}
        GROUP BY b.bidder HAVING bids >= 3
        ORDER BY wins DESC, bids DESC LIMIT 25""", params)
    for r in rows:
        r["hit_rate"] = r["wins"] / r["bids"] if r["bids"] else 0
    return {"competitors": rows}


@bidder_router.get("/api/bidder/competitors/{name}")
def competitor_detail(name: str):
    rows = db.query("""
        SELECT a.ref_no,a.title,a.buyer,a.category,a.awarded_at,
               a.estimated_value,a.n_bidders,a.winner,
               b.amount,b.rank, b.amount*1.0/a.estimated_value AS ratio
        FROM bids b JOIN awards a ON a.id=b.award_id
        WHERE b.bidder=? ORDER BY a.awarded_at DESC LIMIT 60""", (name,))
    if not rows:
        raise HTTPException(404, "No bidding history for that firm")
    wins = [r for r in rows if r["rank"] == 1]
    ratios = sorted(r["ratio"] for r in rows)
    by_cat = {}
    for r in rows:
        c = by_cat.setdefault(r["category"], {"bids": 0, "wins": 0})
        c["bids"] += 1
        c["wins"] += 1 if r["rank"] == 1 else 0
    return {
        "bidder": name, "bids": len(rows), "wins": len(wins),
        "hit_rate": len(wins) / len(rows),
        "median_ratio": st.quantile(ratios, 0.5),
        "categories": [{"category": k, **v} for k, v in sorted(
            by_cat.items(), key=lambda kv: -kv[1]["bids"])],
        "history": rows[:25],
    }


@bidder_router.get("/api/bidder/screens")
def screens(request: Request):
    return cartel.run_screens(request.query_params.get("buyer"),
                              request.query_params.get("category"))


@bidder_router.get("/api/bidder/screens/ranked")
def screens_ranked(request: Request):
    limit = int(request.query_params.get("limit", 12))
    return {"buckets": cartel.rank_buckets(limit)}


@bidder_router.get("/api/bidder/vendor-network")
def vendor_network(user=Depends(current_user)):
    """Other firms this bidder's company has shared a tender with -- how often
    they show up in the same bucket, and who wins more."""
    profile = get_profile(user["id"])
    categories = profile.get("categories") or []
    if not categories:
        top_cats = db.query("""SELECT category, COUNT(*) c FROM awards
                               GROUP BY category ORDER BY c DESC LIMIT 3""")
        categories = [c["category"] for c in top_cats]

    placeholders = ",".join("?" for _ in categories) or "''"
    rows = db.query(f"""
        SELECT b.bidder,
               COUNT(DISTINCT a.id) AS shared_tenders,
               SUM(CASE WHEN b.rank=1 THEN 1 ELSE 0 END) AS wins,
               AVG(b.amount*1.0/a.estimated_value) AS avg_ratio
        FROM bids b JOIN awards a ON a.id=b.award_id
        WHERE a.category IN ({placeholders})
        GROUP BY b.bidder ORDER BY shared_tenders DESC LIMIT 20""", categories)
    for r in rows:
        r["win_rate"] = r["wins"] / r["shared_tenders"] if r["shared_tenders"] else 0
    return {"categories": categories, "network": rows}


# ------------------------------------------------------------------ pricing

@bidder_router.post("/api/bidder/pricing/recommend")
def pricing_recommend(body: dict):
    tid = body.get("tender_id")
    row = None
    if tid:
        row = db.query_one("SELECT * FROM tenders WHERE id=?", (int(tid),))
        if not row:
            raise HTTPException(404, "Tender not found")
        buyer, category, value = row["buyer"], row["category"], row["estimated_value"]
    elif body.get("buyer") and body.get("category") and body.get("estimated_value"):
        buyer, category, value = body["buyer"], body["category"], float(body["estimated_value"])
    else:
        raise HTTPException(400, "Provide tender_id, or buyer/category/estimated_value")
    cost = body.get("cost")
    cost = float(cost) if cost is not None else value * float(body.get("cost_ratio", 0.82))
    target = float(body.get("target_margin_pct", 8.0))
    result = pricing.recommend(buyer, category, value, cost, target)
    if row:
        result["tender"] = {"id": row["id"], "title": row["title"], "emd": row["emd"],
                            "closes_at": row["closes_at"]}
    return result


@bidder_router.post("/api/bidder/pricing/evaluate")
def pricing_evaluate(body: dict):
    tid = body.get("tender_id")
    if tid:
        row = db.query_one("SELECT * FROM tenders WHERE id=?", (int(tid),))
        if not row:
            raise HTTPException(404, "Tender not found")
        buyer, category, value = row["buyer"], row["category"], row["estimated_value"]
    elif body.get("buyer") and body.get("category") and body.get("estimated_value"):
        buyer, category, value = body["buyer"], body["category"], float(body["estimated_value"])
    else:
        raise HTTPException(400, "Provide tender_id, or buyer/category/estimated_value")
    cost = body.get("cost")
    cost = float(cost) if cost is not None else value * 0.82
    if "bid" not in body:
        raise HTTPException(400, "Missing required field: bid")
    return pricing.evaluate_bid(buyer, category, value, cost, float(body["bid"]))
