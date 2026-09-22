"""
Government portal -- merges tender authoring/evaluation/award (what SecureBid
called "Tender Caller") with cross-department oversight (what it called
"Official") into one role, matching the video's design.

    GET  /api/government/dashboard          KPIs + recent tenders + anomaly queue
    GET  /api/government/tenders            All Tenders (any officer, any status)
    POST /api/government/tenders            create a tender (draft)
    GET  /api/government/tenders/{id}       detail (+ submissions)
    PUT  /api/government/tenders/{id}       edit / publish / close
    DELETE /api/government/tenders/{id}
    GET  /api/government/evaluation         Under Evaluation queue
    POST /api/government/tenders/{id}/award pick a winner
    GET  /api/government/anomaly-signals    system-wide collusion screens
    GET  /api/government/investigation-queue  highest-risk buckets
    GET  /api/government/vendor-registry    every bidder company + track record
    GET  /api/government/pending-accounts   self-registered accounts awaiting approval
    POST /api/government/pending-accounts/{id}/approve
    POST /api/government/pending-accounts/{id}/reject
"""

import json
import uuid
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request

from .. import db
from ..deps import current_user, require_role
from ..engine import cartel
from ..engine.eligibility import parse_eligibility
from ..helpers import TODAY, tender_public

router = APIRouter(tags=["government"], dependencies=[Depends(require_role("government"))])


@router.get("/api/government/dashboard")
def dashboard():
    totals = db.query_one("""
        SELECT (SELECT COUNT(*) FROM tenders WHERE status='published') AS active_tenders,
               (SELECT COUNT(*) FROM tenders t WHERE t.status='published'
                    AND EXISTS(SELECT 1 FROM submissions s WHERE s.tender_id=t.id)) AS under_evaluation,
               (SELECT COUNT(*) FROM awards) AS awarded_tenders,
               (SELECT COALESCE(SUM(winning_bid),0) FROM awards) AS total_value""")

    anomalies = cartel.rank_buckets(50)
    cases_requiring_review = sum(1 for b in anomalies if b.get("risk") == "elevated")

    recent = db.query("""
        SELECT t.*, u.company_name AS officer_name
        FROM tenders t LEFT JOIN users u ON u.id = t.created_by_user_id
        ORDER BY t.id DESC LIMIT 8""")

    by_category = defaultdict(float)
    for r in db.query("SELECT category, estimated_value FROM tenders"):
        by_category[r["category"]] += r["estimated_value"] or 0
    total_cat_value = sum(by_category.values()) or 1
    procurement_by_category = sorted(
        [{"category": k, "value": v, "pct": round(100 * v / total_cat_value)}
         for k, v in by_category.items()], key=lambda x: -x["value"])[:6]

    return {
        "totals": {**totals, "cases_requiring_review": cases_requiring_review},
        "recent_tenders": [tender_public(r) | {"officer_name": r["officer_name"]} for r in recent],
        "anomaly_queue": anomalies[:5],
        "procurement_by_category": procurement_by_category,
    }


@router.get("/api/government/tenders")
def all_tenders(request: Request):
    where, params = ["1=1"], []
    status = request.query_params.get("status")
    if status:
        where.append("t.status=?"); params.append(status)
    state = request.query_params.get("state")
    if state:
        where.append("t.buyer_state=?"); params.append(state)
    rows = db.query(f"""
        SELECT t.*, u.company_name AS officer_name,
            (SELECT COUNT(*) FROM submissions s WHERE s.tender_id=t.id) AS submission_count
        FROM tenders t LEFT JOIN users u ON u.id = t.created_by_user_id
        WHERE {' AND '.join(where)} ORDER BY t.id DESC LIMIT 300""", params)
    return {"tenders": [tender_public(r) | {"officer_name": r["officer_name"],
                                            "submission_count": r["submission_count"]}
                        for r in rows]}


@router.post("/api/government/tenders", status_code=201)
def create_tender(body: dict, user=Depends(current_user)):
    for f in ("title", "category", "estimated_value", "closes_at"):
        if not body.get(f):
            raise HTTPException(400, f"Missing required field: {f}")
    raw_eligibility = body.get("raw_eligibility", "")
    eligibility_json = parse_eligibility(raw_eligibility) if raw_eligibility else {}
    value = float(body["estimated_value"])
    emd = float(body.get("emd") or value * 0.02)

    tid = db.execute("""
        INSERT INTO tenders (ref_no,title,buyer,buyer_state,category,portal,
            estimated_value,emd,tender_fee,published_at,closes_at,
            completion_months,description,raw_eligibility,eligibility_json,
            expected_bidders,created_by_user_id,status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
        f"GOV-{uuid.uuid4().hex[:8].upper()}", body["title"],
        body.get("buyer") or user["company_name"], body.get("buyer_state", ""),
        body["category"], body.get("portal", "Direct"), value, emd,
        float(body.get("tender_fee") or 0), TODAY.isoformat(), body["closes_at"],
        int(body.get("completion_months") or 6), body.get("description", ""),
        raw_eligibility, json.dumps(eligibility_json),
        int(body.get("expected_bidders") or 0), user["id"], body.get("status", "draft")))
    return tender_public(db.query_one("SELECT * FROM tenders WHERE id=?", (tid,)))


@router.get("/api/government/tenders/{tid}")
def tender_detail(tid: int):
    row = db.query_one("SELECT * FROM tenders WHERE id=?", (tid,))
    if not row:
        raise HTTPException(404, "Not found")
    t = tender_public(row)
    t["submissions"] = db.query("""
        SELECT s.*, u.company_name FROM submissions s
        JOIN users u ON u.id = s.bidder_user_id
        WHERE s.tender_id=? ORDER BY s.amount ASC""", (tid,))
    return t


@router.put("/api/government/tenders/{tid}")
def update_tender(tid: int, body: dict):
    if not db.query_one("SELECT id FROM tenders WHERE id=?", (tid,)):
        raise HTTPException(404, "Not found")
    fields = ["title", "buyer", "buyer_state", "category", "portal",
              "estimated_value", "emd", "tender_fee", "closes_at",
              "completion_months", "description", "status"]
    sets, params = [], []
    for f in fields:
        if f in body:
            sets.append(f"{f}=?"); params.append(body[f])
    if "raw_eligibility" in body:
        sets.append("raw_eligibility=?"); params.append(body["raw_eligibility"])
        sets.append("eligibility_json=?")
        params.append(json.dumps(parse_eligibility(body["raw_eligibility"])
                                 if body["raw_eligibility"] else {}))
    if sets:
        params.append(tid)
        db.execute(f"UPDATE tenders SET {','.join(sets)} WHERE id=?", params)
    return tender_public(db.query_one("SELECT * FROM tenders WHERE id=?", (tid,)))


@router.delete("/api/government/tenders/{tid}")
def delete_tender(tid: int):
    row = db.query_one("SELECT status FROM tenders WHERE id=?", (tid,))
    if not row:
        raise HTTPException(404, "Not found")
    if row["status"] != "draft":
        raise HTTPException(400, "Only draft tenders can be deleted")
    db.execute("DELETE FROM tenders WHERE id=?", (tid,))
    return {"deleted": tid}


@router.post("/api/government/tenders/{tid}/submissions/{sid}/status")
def set_submission_status(tid: int, sid: int, body: dict):
    status = body.get("status")
    if status not in ("submitted", "shortlisted", "rejected"):
        raise HTTPException(400, "Unknown status")
    db.execute("UPDATE submissions SET status=? WHERE id=? AND tender_id=?", (status, sid, tid))
    return {"ok": True}


@router.get("/api/government/evaluation")
def under_evaluation():
    rows = db.query("""
        SELECT t.id, t.ref_no, t.title, t.buyer, t.closes_at,
               COUNT(s.id) AS bids_received, MIN(s.submitted_at) AS opened_on,
               (SELECT u.company_name FROM submissions s2 JOIN users u ON u.id=s2.bidder_user_id
                WHERE s2.tender_id=t.id ORDER BY s2.amount ASC LIMIT 1) AS l1_bidder,
               (SELECT s2.id FROM submissions s2
                WHERE s2.tender_id=t.id ORDER BY s2.amount ASC LIMIT 1) AS l1_submission_id
        FROM tenders t JOIN submissions s ON s.tender_id = t.id
        WHERE t.status='published'
        GROUP BY t.id ORDER BY bids_received DESC""")
    return {"tenders": rows}


@router.post("/api/government/tenders/{tid}/award")
def award_tender(tid: int, body: dict):
    row = db.query_one("SELECT * FROM tenders WHERE id=?", (tid,))
    if not row:
        raise HTTPException(404, "Not found")
    if row["status"] == "closed":
        raise HTTPException(400, "Tender already closed")
    subs = db.query("""SELECT s.*, u.company_name FROM submissions s
        JOIN users u ON u.id=s.bidder_user_id WHERE s.tender_id=? ORDER BY s.amount ASC""",
        (tid,))
    if not subs:
        raise HTTPException(400, "No submissions to award")

    winner_id = body.get("submission_id")
    ordered = sorted(subs, key=lambda s: s["amount"])
    winner = next((s for s in ordered if s["id"] == winner_id), ordered[0])

    with db.transaction() as conn:
        award_id = db.execute("""
            INSERT INTO awards (ref_no,title,buyer,buyer_state,category,
                estimated_value,awarded_at,n_bidders,winner,winning_bid)
            VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (row["ref_no"], row["title"], row["buyer"], row["buyer_state"], row["category"],
             row["estimated_value"], TODAY.isoformat(), len(ordered),
             winner["company_name"], winner["amount"]), conn=conn)

        for rank, s in enumerate(ordered, start=1):
            db.execute("INSERT INTO bids (award_id,bidder,amount,rank) VALUES (?,?,?,?)",
                      (award_id, s["company_name"], s["amount"], rank), conn=conn)
            new_status = "won" if s["id"] == winner["id"] else "lost"
            db.execute("UPDATE submissions SET status=? WHERE id=?", (new_status, s["id"]), conn=conn)
            db.execute("""UPDATE pipeline SET status=?,updated_at=?
                         WHERE tender_id=? AND user_id=?""",
                      (new_status, TODAY.isoformat(), tid, s["bidder_user_id"]), conn=conn)

        db.execute("UPDATE tenders SET status='closed' WHERE id=?", (tid,), conn=conn)

    return {"award_id": award_id, "winner": winner["company_name"], "winning_bid": winner["amount"]}


@router.get("/api/government/anomaly-signals")
def anomaly_signals(request: Request):
    limit = int(request.query_params.get("limit", 30))
    return {"buckets": cartel.rank_buckets(limit)}


@router.get("/api/government/investigation-queue")
def investigation_queue():
    """The highest-risk buckets from the anomaly screen -- the subset that
    actually warrants a human follow-up rather than just monitoring."""
    buckets = cartel.rank_buckets(50)
    flagged = [b for b in buckets if b.get("risk") == "elevated"]
    return {"cases": flagged}


@router.get("/api/government/vendor-registry")
def vendor_registry(request: Request):
    q = request.query_params.get("q", "").lower()
    rows = db.query("""
        SELECT b.bidder AS company_name,
               COUNT(DISTINCT b.award_id) AS bids,
               SUM(CASE WHEN b.rank=1 THEN 1 ELSE 0 END) AS wins,
               SUM(CASE WHEN b.rank=1 THEN a.estimated_value ELSE 0 END) AS won_value,
               AVG(b.amount*1.0/a.estimated_value) AS avg_ratio
        FROM bids b JOIN awards a ON a.id = b.award_id
        GROUP BY b.bidder ORDER BY wins DESC LIMIT 200""")
    if q:
        rows = [r for r in rows if q in r["company_name"].lower()]
    for r in rows:
        r["hit_rate"] = r["wins"] / r["bids"] if r["bids"] else 0
    return {"vendors": rows}


# ---------------------------------------------------------- account approval

@router.get("/api/government/pending-accounts")
def pending_accounts():
    rows = db.query("""
        SELECT id, email, company_name, role, created_at
        FROM users WHERE status='pending' ORDER BY created_at, id""")
    return {"accounts": rows}


@router.post("/api/government/pending-accounts/{uid}/approve")
def approve_account(uid: int):
    if not db.query_one("SELECT id FROM users WHERE id=? AND status='pending'", (uid,)):
        raise HTTPException(404, "No pending account with that id")
    db.execute("UPDATE users SET status='active' WHERE id=?", (uid,))
    return {"ok": True}


@router.post("/api/government/pending-accounts/{uid}/reject")
def reject_account(uid: int):
    if not db.query_one("SELECT id FROM users WHERE id=? AND status='pending'", (uid,)):
        raise HTTPException(404, "No pending account with that id")
    # A rejected application never had an active session (login refuses
    # pending accounts), so removing the row outright is safe -- there's
    # nothing else referencing it yet.
    db.execute("DELETE FROM users WHERE id=?", (uid,))
    return {"ok": True}
