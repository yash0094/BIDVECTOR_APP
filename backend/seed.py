"""
Synthetic data generator for BidVector.

The real product would ingest CPPP/GeM/state-portal feeds. For a runnable
demo we generate a corpus that is statistically realistic enough that the
pricing engine, the eligibility parser and the collusion screens all have
something true to say -- see the module docstring in the original SecureBid
build this is adapted from for the full rationale. Everything is seeded from
a fixed RNG so two people running this get the same numbers.
"""

import json
import random
import math
from datetime import datetime, timedelta

from . import db
from .auth import hash_password
from .engine.eligibility import parse_eligibility

RNG = random.Random(20260917)

LAKH = 100_000
CRORE = 10_000_000

BUYERS = [
    ("PHED Rajasthan", "Rajasthan",
     ["Water Supply & Sanitation", "Civil Works"], 1.4, 0.92),
    ("MSEDCL", "Maharashtra",
     ["Electrical Works", "Solar & Renewables"], 1.1, 0.95),
    ("Pune Municipal Corporation", "Maharashtra",
     ["Civil Works", "Road Works", "Solid Waste Management"], 0.9, 0.90),
    ("CPWD", "Delhi",
     ["Civil Works", "Electrical Works"], 1.3, 0.91),
    ("NHAI", "Delhi",
     ["Road Works"], 3.0, 0.93),
    ("BSNL", "Delhi",
     ["IT Services & Software", "Electrical Works"], 0.8, 0.89),
    ("South Western Railway", "Karnataka",
     ["Civil Works", "Fleet & Transport", "Electrical Works"], 1.2, 0.92),
    ("Karnataka Rural Development & Panchayat Raj", "Karnataka",
     ["Water Supply & Sanitation", "Road Works", "Civil Works"], 0.7, 0.88),
    ("ESIC Medical", "Delhi",
     ["Medical Equipment", "Facility Services"], 0.6, 0.94),
    ("Brihanmumbai Municipal Corporation", "Maharashtra",
     ["Civil Works", "Solid Waste Management", "Facility Services"], 1.5, 0.91),
    ("KSRTC", "Karnataka",
     ["Fleet & Transport", "Facility Services"], 0.7, 0.93),
    ("Directorate of Education, GNCTD", "Delhi",
     ["Office Supplies & Furniture", "IT Services & Software"], 0.4, 0.90),
    ("TANGEDCO", "Tamil Nadu",
     ["Electrical Works", "Solar & Renewables"], 1.2, 0.94),
    ("Gujarat Water Supply & Sewerage Board", "Gujarat",
     ["Water Supply & Sanitation"], 1.3, 0.92),
]

CATEGORY_TITLES = {
    "Water Supply & Sanitation": [
        "Rural water pipeline, Phase {p}",
        "Construction of {n} MLD water treatment plant",
        "Laying of DI K-9 pipeline, {n} km, {block} block",
        "Overhead service reservoir, {n} KL capacity",
        "Sewerage network augmentation, ward {n}",
    ],
    "Civil Works": [
        "Construction of PHC building at {block}",
        "Repair and renovation of government school, {block}",
        "Boundary wall and site development, {block} campus",
        "Construction of {n} unit staff quarters",
        "RCC storm water drain, {n} m, {block}",
    ],
    "Road Works": [
        "Widening and strengthening of {block} road, {n} km",
        "Periodic renewal of bitumen surface, {n} km",
        "Construction of RCC culverts, package {p}",
        "Pothole repair and resurfacing, zone {p}",
    ],
    "Electrical Works": [
        "Supply and erection of {n} kVA distribution transformers",
        "HT/LT line augmentation, {block} feeder",
        "Internal electrification of {block} building",
        "Supply of {n} nos LED street light fittings",
    ],
    "Solar & Renewables": [
        "Solar street lighting, {n} poles, {block}",
        "{n} kWp rooftop solar PV with net metering",
        "Solar water pumping systems, {n} nos",
    ],
    "IT Services & Software": [
        "Supply of {n} desktop computers with 3-year warranty",
        "Development and maintenance of departmental portal",
        "Networking and structured cabling, {block} office",
        "AMC of IT infrastructure for {n} locations",
    ],
    "Medical Equipment": [
        "Supply of {n} multipara patient monitors",
        "Supply and installation of digital X-ray system",
        "Supply of surgical consumables, annual rate contract",
    ],
    "Office Supplies & Furniture": [
        "School furniture supply, {n} blocks",
        "Supply of office stationery, annual rate contract",
        "Supply of {n} steel almirahs and filing cabinets",
    ],
    "Solid Waste Management": [
        "Door-to-door waste collection, ward {n}",
        "Supply of {n} compactor vehicles",
        "Operation of material recovery facility, zone {p}",
    ],
    "Facility Services": [
        "Housekeeping and sanitation services, {block}",
        "Manpower supply for {n} posts, 2 years",
        "Comprehensive AMC of HVAC systems",
    ],
    "Fleet & Transport": [
        "Hiring of {n} buses on per-km basis",
        "Supply of {n} nos tyres, annual rate contract",
        "Vehicle body building for {n} chassis",
    ],
}

BLOCKS = ["Bhilwara", "Nagaur", "Haveli", "Shirur", "Chikkaballapur", "Tumkur",
          "Rohini", "Dwarka", "Karjat", "Palghar", "Mehsana", "Rajkot",
          "Coimbatore", "Salem", "Hubballi", "Belagavi", "Jodhpur", "Alwar"]

FIRM_PREFIX = ["Shree", "Sai", "Maruti", "Ganesh", "Vishwa", "Aditya", "Kirti",
               "Navkar", "Balaji", "Shakti", "Prerna", "Hindustan", "Deccan",
               "Konkan", "Sahyadri", "Rajputana", "Cauvery", "Narmada",
               "Sardar", "Kaveri", "Anand", "Om", "Jai", "Sanjeevani"]
FIRM_MID = ["Infra", "Constructions", "Engineering", "Enterprises", "Techno",
            "Udyog", "Industries", "Associates", "Projects", "Systems",
            "Traders", "Agencies", "Works", "Solutions"]
FIRM_SUFFIX = ["Pvt Ltd", "& Co", "LLP", "Pvt Ltd", "& Sons", ""]


def firm_name(rng):
    s = f"{rng.choice(FIRM_PREFIX)} {rng.choice(FIRM_MID)}"
    suf = rng.choice(FIRM_SUFFIX)
    return f"{s} {suf}".strip()


def make_firms(rng, n):
    seen, out = set(), []
    while len(out) < n:
        f = firm_name(rng)
        if f not in seen:
            seen.add(f)
            out.append(f)
    return out


ELIGIBILITY_TEMPLATE = """3. ELIGIBILITY CRITERIA

3.1 The bidder shall have an average annual turnover of Rs. {turnover} during the last three financial years, duly certified by a Chartered Accountant.

3.2 The bidder must possess minimum {exp} years experience in execution of works of similar nature under any Central/State Government department, PSU or Urban Local Body.

3.3 The bidder should have successfully completed {swcount} similar work of value not less than Rs. {similar} during the last seven years ending on the last day of the month previous to the month of submission. Completion certificates issued by an officer not below the rank of Executive Engineer shall be enclosed.

3.4 The bidder shall hold valid GST registration and PAN. {certs}

3.5 {classline}

3.6 Earnest Money Deposit of Rs. {emd} shall be submitted in the form of a Demand Draft or Bank Guarantee from a scheduled commercial bank, valid for 180 days. {msme}

3.7 The bidder shall submit an affidavit on non-judicial stamp paper of Rs. 100 to the effect that the firm has not been blacklisted by any Government department. {jv}

3.8 Bids shall be submitted online only through the {portal} portal using a Class-3 Digital Signature Certificate. Bids received in physical form shall be summarily rejected."""


def money_words(v):
    if v >= CRORE:
        return f"{v / CRORE:.2f} Crore"
    return f"{v / LAKH:.2f} Lakh"


def build_eligibility_text(rng, value, emd, portal):
    turnover = round(value * rng.uniform(0.5, 1.0) / LAKH) * LAKH
    exp = rng.choice([3, 3, 5, 5, 5, 7, 10])
    swcount = rng.choice(["one", "one", "two", "three"])
    frac = {"one": 0.5, "two": 0.4, "three": 0.3}[swcount]
    similar = round(value * frac / LAKH) * LAKH

    cert_pool = ["The bidder shall hold a valid EPF and ESI registration code number.",
                 "ISO 9001:2015 certification for quality management is mandatory.",
                 "The bidder shall hold a valid electrical contractor licence issued "
                 "by the State Licensing Board.",
                 "Registration with NSIC shall be considered an added advantage.",
                 "Products offered shall carry a valid BIS licence."]
    certs = " ".join(rng.sample(cert_pool, rng.choice([0, 1, 1, 2])))

    classline = rng.choice([
        "Only Class-I local suppliers as defined in the Public Procurement "
        "(Preference to Make in India) Order 2017 are eligible to participate.",
        "Class-II local suppliers and above are eligible in terms of the Public "
        "Procurement (Preference to Make in India) Order 2017.",
        "Bidders shall submit a self-certification regarding local content in "
        "terms of the prevailing Make in India Order.",
    ])
    msme = rng.choice([
        "Micro and Small Enterprises registered under Udyam are exempt from "
        "submission of EMD on production of a valid Udyam Registration Certificate.",
        "MSEs are exempt from the cost of tender documents.",
        "",
    ])
    jv = rng.choice([
        "Joint ventures and consortia are permitted subject to submission of a "
        "registered JV agreement.",
        "Joint venture or consortium bids shall not be permitted.",
        "",
    ])
    return ELIGIBILITY_TEMPLATE.format(
        turnover=money_words(turnover), exp=exp, swcount=swcount,
        similar=money_words(similar), certs=certs, classline=classline,
        emd=f"{emd:,.0f}", msme=msme, jv=jv, portal=portal)


def draw_value(rng, scale):
    lo, hi = math.log(6 * LAKH), math.log(40 * CRORE)
    v = math.exp(rng.uniform(lo, hi)) * scale
    v = min(max(v, 4 * LAKH), 90 * CRORE)
    return round(v / LAKH) * LAKH


def draw_emd(rng, value):
    pct = rng.choice([0.01, 0.02, 0.02, 0.02, 0.025])
    emd = value * pct
    emd = min(emd, 20 * LAKH)
    return round(emd / 1000) * 1000


def n_bidders_for(rng, value):
    if value < 25 * LAKH:
        lam = 8.5
    elif value < 1 * CRORE:
        lam = 6.5
    elif value < 5 * CRORE:
        lam = 5.0
    elif value < 25 * CRORE:
        lam = 4.0
    else:
        lam = 3.2
    n = 0
    p = math.exp(-lam)
    cum, u = p, rng.random()
    while cum < u and n < 20:
        n += 1
        p *= lam / n
        cum += p
    return max(2, min(n, 16))


def bucket_params(buyer, category, competitiveness):
    h = abs(hash((buyer, category))) % 1000 / 1000.0
    mean_ratio = competitiveness - 0.04 * h
    sigma = 0.035 + 0.045 * ((h * 7) % 1)
    return mean_ratio, sigma


def seed(verbose=True):
    conn = db.init_db()
    if db.is_seeded():
        if verbose:
            print("Database already seeded; skipping.")
        return

    rng = RNG
    firms = make_firms(rng, 130)
    ring = firms[:4]

    today = datetime(2026, 9, 17)

    # ---------------------------------------------------------- historical
    awards, all_bids = [], []
    ref = 40000
    for _ in range(900):
        buyer, state, cats, scale, comp = rng.choice(BUYERS)
        category = rng.choice(cats)
        value = draw_value(rng, scale)
        awarded = today - timedelta(days=rng.randint(20, 1100))
        n = n_bidders_for(rng, value)
        mean_ratio, sigma = bucket_params(buyer, category, comp)

        colluded = (buyer == "MSEDCL" and category == "Electrical Works"
                    and rng.random() < 0.72)

        if colluded:
            participants = list(ring) + rng.sample(firms[4:40], rng.choice([0, 0, 1, 2]))
            winner = ring[awarded.toordinal() % len(ring)]
            cover_level = rng.gauss(mean_ratio + 0.055, 0.008)
            amounts = {}
            for f in participants:
                if f == winner:
                    r = cover_level - rng.uniform(0.055, 0.085)
                elif f in ring:
                    r = rng.gauss(cover_level, 0.006)
                else:
                    r = rng.gauss(mean_ratio + 0.01, sigma)
                amt = max(0.45, min(r, 1.25)) * value
                amt = round(amt / 10000) * 10000 if f in ring else round(amt)
                amounts[f] = amt
        else:
            participants = rng.sample(firms, n)
            amounts = {}
            for f in participants:
                r = rng.gauss(mean_ratio, sigma)
                r = max(0.55, min(r, 1.30))
                amounts[f] = round(r * value)

        ordered = sorted(amounts.items(), key=lambda kv: kv[1])
        winner_name, winning = ordered[0]
        ref += 1
        title = make_title(rng, category)
        awards.append((f"{_ref_prefix(buyer)}/{awarded.year}/{ref}", title, buyer,
                       state, category, value, awarded.strftime("%Y-%m-%d"),
                       len(ordered), winner_name, winning))
        all_bids.append(ordered)

    db.executemany("""
        INSERT INTO awards (ref_no,title,buyer,buyer_state,category,
            estimated_value,awarded_at,n_bidders,winner,winning_bid)
        VALUES (?,?,?,?,?,?,?,?,?,?)""", awards)

    ids = [r["id"] for r in db.query("SELECT id FROM awards ORDER BY id")]
    bid_rows = []
    for aid, ordered in zip(ids, all_bids):
        for rank, (f, amt) in enumerate(ordered, start=1):
            bid_rows.append((aid, f, amt, rank))
    db.executemany(
        "INSERT INTO bids (award_id,bidder,amount,rank) VALUES (?,?,?,?)",
        bid_rows)

    # --------------------------------------------------------- live tenders
    tender_rows = []
    ref = 90000
    for _ in range(200):
        buyer, state, cats, scale, comp = rng.choice(BUYERS)
        category = rng.choice(cats)
        value = draw_value(rng, scale)
        emd = draw_emd(rng, value)
        portal = rng.choice(["CPPP (eprocure.gov.in)", "GeM", "State e-Procurement"])
        published = today - timedelta(days=rng.randint(0, 20))
        closes = published + timedelta(days=rng.randint(12, 45))
        if closes <= today:
            closes = today + timedelta(days=rng.randint(2, 30))
        raw = build_eligibility_text(rng, value, emd, portal)
        parsed = parse_eligibility(raw)
        ref += 1
        tender_rows.append((
            f"{_ref_prefix(buyer)}/{published.year}/{ref}",
            make_title(rng, category), buyer, state, category, portal,
            value, emd, rng.choice([500, 1000, 1180, 2360, 0]),
            published.strftime("%Y-%m-%d"), closes.strftime("%Y-%m-%d"),
            rng.choice([4, 6, 8, 9, 12, 15, 18, 24]),
            make_description(rng, category, value),
            raw, json.dumps(parsed),
            n_bidders_for(rng, value),
        ))

    db.executemany("""
        INSERT INTO tenders (ref_no,title,buyer,buyer_state,category,portal,
            estimated_value,emd,tender_fee,published_at,closes_at,
            completion_months,description,raw_eligibility,eligibility_json,
            expected_bidders)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", tender_rows)

    # ------------------------------------------------------------ demo bidder
    uid = db.execute(
        "INSERT INTO users (email,password_hash,company_name,role,created_at,status) "
        "VALUES (?,?,?,?,?,'active')",
        ("demo@bidvector.in", hash_password("demo1234"),
         "Infra Build Pvt Ltd", "bidder", today.strftime("%Y-%m-%d")))

    db.execute("""
        INSERT INTO profiles (user_id,udyam_no,msme_class,bidder_class,
            turnover_cr,experience_years,max_similar_work_cr,certifications,
            states,categories,working_capital_cr,overhead_pct,target_margin_pct)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
        uid, "UDYAM-MH-26-0041872", "Small", "Class II",
        6.4, 9, 2.75,
        json.dumps(["GST", "PAN", "EPF", "ESI", "Udyam", "ISO 9001"]),
        json.dumps(["Maharashtra", "Karnataka", "Rajasthan"]),
        json.dumps(["Civil Works", "Water Supply & Sanitation", "Road Works"]),
        5.0, 12.0, 9.0))

    live = db.query("SELECT id,emd,estimated_value FROM tenders ORDER BY closes_at LIMIT 40")
    picks = rng.sample(live, 7)
    statuses = ["submitted", "submitted", "preparing", "watching", "won",
                "lost", "submitted"]
    for t, st in zip(picks, statuses):
        cost = t["estimated_value"] * rng.uniform(0.76, 0.86)
        bid = cost * rng.uniform(1.04, 1.14)
        db.execute("""
            INSERT INTO pipeline (user_id,tender_id,status,our_bid,cost_est,
                emd_paid,notes,updated_at) VALUES (?,?,?,?,?,?,?,?)""",
                   (uid, t["id"], st,
                    round(bid) if st != "watching" else None,
                    round(cost),
                    t["emd"] if st in ("submitted", "won", "lost") else 0,
                    "", today.strftime("%Y-%m-%d")))

    for t in picks[:4]:
        row = db.query_one("SELECT title,closes_at FROM tenders WHERE id=?", (t["id"],))
        db.execute("""INSERT INTO alerts (user_id,tender_id,kind,message,created_at,read)
                      VALUES (?,?,?,?,?,0)""",
                   (uid, t["id"], "match",
                    f"New tender matches your profile: {row['title']} "
                    f"(closes {row['closes_at']})",
                    today.strftime("%Y-%m-%d")))

    db.execute("""INSERT INTO saved_searches (user_id,name,params,created_at)
                 VALUES (?,?,?,?)""",
              (uid, "Civil works under 2 Cr, Maharashtra",
               json.dumps({"category": "Civil Works", "state": "Maharashtra",
                          "max_value": 20000000}),
               today.strftime("%Y-%m-%d")))

    bookmark_picks = rng.sample(live, 5)
    for t in bookmark_picks:
        db.execute("""INSERT INTO bookmarks (user_id,tender_id,created_at)
                     VALUES (?,?,?)""", (uid, t["id"], today.strftime("%Y-%m-%d")))

    # ------------------------------------------------------- demo government
    gov_id = db.execute(
        "INSERT INTO users (email,password_hash,company_name,role,created_at,status) "
        "VALUES (?,?,?,?,?,'active')",
        ("gov@bidvector.in", hash_password("demo1234"),
         "Procurement Cell -- CPWD", "government", today.strftime("%Y-%m-%d")))
    db.execute("""INSERT INTO org_profiles (user_id,org_name,department,state,designation)
                 VALUES (?,?,?,?,?)""",
              (gov_id, "Central Public Works Department", "Procurement Cell",
               "Delhi", "Government Officer"))

    gov_tenders = [
        dict(title="Construction of community hall, Shirur block",
             category="Civil Works", estimated_value=8500000, emd=170000,
             closes_at="2026-10-25", status="published"),
        dict(title="Supply of 40 nos LED street light fittings",
             category="Electrical Works", estimated_value=1200000, emd=24000,
             closes_at="2026-11-05", status="published"),
        dict(title="Ward-level door-to-door waste collection, zone 4",
             category="Solid Waste Management", estimated_value=3200000, emd=64000,
             closes_at="2026-11-15", status="draft"),
    ]
    gov_tender_ids = []
    for i, ct in enumerate(gov_tenders):
        tid = db.execute("""
            INSERT INTO tenders (ref_no,title,buyer,buyer_state,category,portal,
                estimated_value,emd,tender_fee,published_at,closes_at,
                completion_months,description,raw_eligibility,eligibility_json,
                expected_bidders,created_by_user_id,status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
            f"CPWD-GOV/{2026}/{100+i}", ct["title"], "CPWD",
            "Delhi", ct["category"], "Direct", ct["estimated_value"], ct["emd"],
            0, today.strftime("%Y-%m-%d"), ct["closes_at"], 6,
            make_description(rng, ct["category"], ct["estimated_value"]),
            "", json.dumps({}), 0, gov_id, ct["status"]))
        gov_tender_ids.append(tid)

    for tid, amount, cost in ((gov_tender_ids[0], 8180000, 7150000),
                              (gov_tender_ids[1], 1165000, 1010000)):
        db.execute("""INSERT INTO submissions
                     (tender_id,bidder_user_id,amount,status,submitted_at)
                     VALUES (?,?,?,?,?)""",
                  (tid, uid, amount, "submitted", today.strftime("%Y-%m-%d")))
        emd_row = db.query_one("SELECT emd FROM tenders WHERE id=?", (tid,))
        db.execute("""INSERT INTO pipeline
                     (user_id,tender_id,status,our_bid,cost_est,emd_paid,notes,updated_at)
                     VALUES (?,?,'submitted',?,?,?,?,?)""",
                  (uid, tid, amount, cost, emd_row["emd"], "",
                   today.strftime("%Y-%m-%d")))

    # A second bidder in the pool submits against the same tender, so the
    # Under Evaluation queue has more than one bid to compare.
    other_uid = db.execute(
        "INSERT INTO users (email,password_hash,company_name,role,created_at,status) "
        "VALUES (?,?,?,?,?,'active')",
        ("rival@bidvector.in", hash_password("demo1234"),
         rng.choice(firms), "bidder", today.strftime("%Y-%m-%d")))
    db.execute("""
        INSERT INTO profiles (user_id,udyam_no,msme_class,bidder_class,
            turnover_cr,experience_years,max_similar_work_cr,certifications,
            states,categories,working_capital_cr,overhead_pct,target_margin_pct)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
        other_uid, "", "Small", "Class II", 4.0, 6, 1.5,
        json.dumps(["GST", "PAN"]), json.dumps(["Delhi"]),
        json.dumps(["Civil Works"]), 0.6, 12.0, 8.0))
    db.execute("""INSERT INTO submissions
                 (tender_id,bidder_user_id,amount,status,submitted_at)
                 VALUES (?,?,?,?,?)""",
              (gov_tender_ids[0], other_uid, 8340000, "submitted",
               today.strftime("%Y-%m-%d")))

    # A couple of pending applications so the Government portal's Pending
    # Approvals screen has something to show on a first run.
    db.execute(
        "INSERT INTO users (email,password_hash,company_name,role,created_at,status) "
        "VALUES (?,?,?,?,?,'pending')",
        ("newvendor@example.com", hash_password("demo1234"),
         "Anand Techno Projects", "bidder", today.strftime("%Y-%m-%d")))
    db.execute(
        "INSERT INTO users (email,password_hash,company_name,role,created_at,status) "
        "VALUES (?,?,?,?,?,'pending')",
        ("newofficer@example.gov.in", hash_password("demo1234"),
         "Directorate of Municipal Administration", "government",
         today.strftime("%Y-%m-%d")))

    if verbose:
        print(f"Seeded {len(awards)} historical awards, {len(bid_rows)} bids, "
              f"{len(tender_rows)} live tenders.")
        print("Demo logins:")
        print("  bidder      demo@bidvector.in / demo1234")
        print("  government  gov@bidvector.in  / demo1234")
        print("  public portal          -- sign in with either account, then open /public")


def _ref_prefix(buyer):
    return "".join(w[0] for w in buyer.split()[:3]).upper()


def make_title(rng, category):
    tpl = rng.choice(CATEGORY_TITLES.get(category, ["Procurement of goods"]))
    return tpl.format(n=rng.choice([2, 4, 5, 8, 10, 12, 24, 40, 60, 120, 250, 500]),
                      p=rng.choice(["I", "II", "III", "IV"]),
                      block=rng.choice(BLOCKS))


def make_description(rng, category, value):
    return (f"Sealed two-cover e-tender for {category.lower()} under the "
            f"annual plan. Estimated cost put to tender is Rs "
            f"{money_words(value)}. Bidders shall quote a percentage "
            f"above/below the estimated cost in the BoQ uploaded on the portal. "
            f"Rates shall be inclusive of all taxes, duties, royalty and "
            f"cess except GST, which shall be paid extra as applicable. "
            f"Defect liability period of {rng.choice([12, 24, 36])} months "
            f"applies from the date of completion.")


if __name__ == "__main__":
    seed()
