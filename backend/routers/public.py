"""
Public Tender Portal -- open access, no account required. Citizens,
researchers and transparency advocates. Exposes only aggregate/historical
data: no live bid amounts, no bidder contact details, no per-officer info.

    GET /api/public/tenders             published tenders (search)
    GET /api/public/awards              past awards & results
    GET /api/public/price-transparency  estimated vs winning-bid comparison
    GET /api/public/statistics          headline procurement statistics
"""

from collections import defaultdict

from fastapi import APIRouter, Request

from .. import db
from ..helpers import TODAY, tender_public

router = APIRouter(tags=["public"])


@router.get("/api/public/tenders")
def public_tenders(request: Request):
    q = request.query_params.get("q", "").strip().lower()
    where, params = ["1=1"], []
    if q:
        where.append("(LOWER(title) LIKE ? OR LOWER(buyer) LIKE ? OR LOWER(ref_no) LIKE ?)")
        like = f"%{q}%"
        params += [like, like, like]
    state = request.query_params.get("state")
    if state:
        where.append("buyer_state=?"); params.append(state)
    category = request.query_params.get("category")
    if category:
        where.append("category=?"); params.append(category)
    rows = db.query(f"""
        SELECT ref_no,title,buyer,buyer_state,category,estimated_value,
               published_at,closes_at,status
        FROM tenders WHERE {' AND '.join(where)}
        ORDER BY closes_at DESC LIMIT 200""", params)
    for r in rows:
        r["days_left"] = None
        try:
            from datetime import datetime
            d = datetime.strptime(r["closes_at"], "%Y-%m-%d").date()
            r["days_left"] = (d - TODAY).days
        except (ValueError, TypeError):
            pass
        r["public_status"] = ("Awarded" if r["status"] == "closed"
                              else "Closing Soon" if (r["days_left"] is not None and 0 <= r["days_left"] <= 5)
                              else "Open" if r["status"] == "published" else "Draft")
    return {"total": len(rows), "results": rows}


@router.get("/api/public/awards")
def public_awards(request: Request):
    q = request.query_params.get("q", "").strip().lower()
    rows = db.query("""
        SELECT ref_no,title,buyer,buyer_state,category,estimated_value,
               awarded_at,n_bidders,winner,winning_bid,
               winning_bid*1.0/estimated_value AS l1_ratio
        FROM awards ORDER BY awarded_at DESC LIMIT 200""")
    if q:
        rows = [r for r in rows if q in r["title"].lower() or q in r["buyer"].lower()
               or q in (r["winner"] or "").lower()]
    return {"total": len(rows), "results": rows}


@router.get("/api/public/price-transparency")
def price_transparency():
    """Estimated value vs. actual winning bid, aggregated by category -- the
    "how much did competitive bidding actually save" table."""
    rows = db.query("""
        SELECT category, COUNT(*) AS n,
               SUM(estimated_value) AS total_estimated,
               SUM(winning_bid) AS total_awarded,
               AVG(winning_bid*1.0/estimated_value) AS avg_l1_ratio
        FROM awards GROUP BY category ORDER BY total_estimated DESC""")
    for r in rows:
        r["savings_pct"] = round(100 * (1 - (r["avg_l1_ratio"] or 1)), 1)
    return {"by_category": rows}


@router.get("/api/public/statistics")
def statistics():
    totals = db.query_one("""
        SELECT (SELECT COUNT(*) FROM tenders) AS total_tenders,
               (SELECT COALESCE(SUM(winning_bid),0) FROM awards) AS total_value,
               (SELECT AVG(n_bidders) FROM awards) AS avg_bidders,
               (SELECT AVG(1 - winning_bid*1.0/estimated_value) FROM awards) AS avg_l1_saving""")

    by_state = defaultdict(float)
    for r in db.query("SELECT buyer_state, estimated_value FROM tenders"):
        by_state[r["buyer_state"]] += r["estimated_value"] or 0
    top_states = sorted(
        [{"state": k, "value": v} for k, v in by_state.items() if k], key=lambda x: -x["value"])[:6]

    by_category = defaultdict(float)
    total_cat = 0.0
    for r in db.query("SELECT category, estimated_value FROM tenders"):
        by_category[r["category"]] += r["estimated_value"] or 0
        total_cat += r["estimated_value"] or 0
    total_cat = total_cat or 1
    category_distribution = sorted(
        [{"category": k, "pct": round(100 * v / total_cat, 1)} for k, v in by_category.items()],
        key=lambda x: -x["pct"])[:6]

    return {
        "totals": totals,
        "top_procuring_states": top_states,
        "category_distribution": category_distribution,
    }
