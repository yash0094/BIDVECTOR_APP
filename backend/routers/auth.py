"""
Auth for both accounts-with-login roles: bidder (public/contractor) and
government (procurement officer). The Public portal reuses either account
-- see routers/public.py.

    POST /api/auth/register              create account (+ bidder profile or org profile)
    POST /api/auth/login                 bearer token
    POST /api/auth/logout                revoke every token issued for this account
    GET  /api/me                         account + profile
    PUT  /api/profile                    update bidder company profile
    PUT  /api/org-profile                update government org profile
    POST /api/auth/request-password-reset  send a reset link if the email exists
    POST /api/auth/reset-password        consume a reset link, set a new password
    POST /api/auth/change-password       change password while signed in
    POST /api/auth/google                sign in / register a bidder with a Google ID token
    GET  /api/config                     runtime flags (Google client id)
"""

import json
import os
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from .. import db
from ..auth import (hash_password, verify_password, make_token,
                    make_action_token, read_action_token, verify_password)
from ..deps import current_user
from ..helpers import TODAY, get_profile, get_org_profile
from ..mailer import send_mail

router = APIRouter(tags=["auth"])

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")

ROLES = ("bidder", "government")


def _public_user(row):
    return {"id": row["id"], "email": row["email"], "company_name": row["company_name"],
            "role": row["role"]}


class BidderProfileIn(BaseModel):
    udyam_no: Optional[str] = ""
    msme_class: Optional[str] = "Micro"
    bidder_class: Optional[str] = "Class II"
    turnover_cr: Optional[float] = 0
    experience_years: Optional[float] = 0
    max_similar_work_cr: Optional[float] = 0
    certifications: Optional[list] = None
    states: Optional[list] = None
    categories: Optional[list] = None
    working_capital_cr: Optional[float] = 0.25
    overhead_pct: Optional[float] = 12
    target_margin_pct: Optional[float] = 8


class OrgProfileIn(BaseModel):
    org_name: Optional[str] = ""
    department: Optional[str] = ""
    state: Optional[str] = ""
    designation: Optional[str] = ""


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    company_name: str
    role: str = "bidder"
    profile: Optional[BidderProfileIn] = None
    org_profile: Optional[OrgProfileIn] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@router.post("/api/auth/register", status_code=201)
def register(body: RegisterIn):
    if body.role not in ROLES:
        raise HTTPException(400, "Unknown account type")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    email = body.email.strip().lower()
    if db.query_one("SELECT id FROM users WHERE email=?", (email,)):
        raise HTTPException(409, "An account with that email already exists")

    uid = db.execute(
        "INSERT INTO users (email,password_hash,company_name,role,created_at) "
        "VALUES (?,?,?,?,?)",
        (email, hash_password(body.password), body.company_name, body.role,
         TODAY.isoformat()))

    if body.role == "bidder":
        p = body.profile or BidderProfileIn()
        db.execute("""
            INSERT INTO profiles (user_id,udyam_no,msme_class,bidder_class,
                turnover_cr,experience_years,max_similar_work_cr,certifications,
                states,categories,working_capital_cr,overhead_pct,target_margin_pct)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
            uid, p.udyam_no, p.msme_class, p.bidder_class,
            float(p.turnover_cr or 0), float(p.experience_years or 0),
            float(p.max_similar_work_cr or 0),
            json.dumps(p.certifications or ["GST", "PAN"]),
            json.dumps(p.states or []), json.dumps(p.categories or []),
            float(p.working_capital_cr or 0.25), float(p.overhead_pct or 12),
            float(p.target_margin_pct or 8)))
    else:
        o = body.org_profile or OrgProfileIn()
        db.execute("""
            INSERT INTO org_profiles (user_id,org_name,department,state,designation)
            VALUES (?,?,?,?,?)""",
            (uid, o.org_name, o.department, o.state, o.designation))

    # New accounts start pending -- no token issued yet; they can't sign in
    # until a Government user approves them (see /api/government/pending-accounts).
    return {"pending": True,
            "message": "Your application has been submitted. A Government "
                       "Official will review and activate your account before "
                       "you can sign in."}


@router.get("/api/config")
def public_config():
    """Lets the frontend know at runtime whether Google sign-in is usable."""
    return {"google_client_id": GOOGLE_CLIENT_ID}


@router.post("/api/auth/google")
def google_sign_in(body: dict):
    """Real Google sign-in: verifies the ID token Google itself issued against
    Google's public keys (via the `google-auth` library). Requires
    GOOGLE_CLIENT_ID in the environment. Bidder accounts only, same as the
    "Continue with Google" button only appearing on the bidder login tab."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google sign-in is not configured on this server")

    credential = body.get("credential")
    if not credential:
        raise HTTPException(400, "Missing required field: credential")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
        idinfo = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), GOOGLE_CLIENT_ID)
    except Exception:
        raise HTTPException(401, "Google sign-in failed: invalid or expired credential")

    if not idinfo.get("email_verified", False):
        raise HTTPException(401, "Google account email is not verified")

    email = idinfo["email"].strip().lower()
    user = db.query_one("SELECT * FROM users WHERE email=?", (email,))

    if user and user["role"] != "bidder":
        raise HTTPException(409, "This email is registered as a government account -- "
                                 "sign in from that portal instead")

    is_new = not user
    if not user:
        uid = db.execute(
            "INSERT INTO users (email,password_hash,company_name,role,created_at) "
            "VALUES (?,?,?,?,?)",
            (email, hash_password(secrets.token_urlsafe(32)),
             idinfo.get("name") or email.split("@")[0], "bidder", TODAY.isoformat()))
        db.execute("""
            INSERT INTO profiles (user_id,udyam_no,msme_class,bidder_class,turnover_cr,
                experience_years,max_similar_work_cr,certifications,states,categories,
                working_capital_cr,overhead_pct,target_margin_pct)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (uid, "", "Micro", "Class II", 0, 0, 0,
             json.dumps(["GST", "PAN"]), json.dumps([]), json.dumps([]), 0.25, 12.0, 8.0))
        user = db.query_one("SELECT * FROM users WHERE id=?", (uid,))

    if user["status"] != "active":
        if is_new:
            raise HTTPException(403, "Your application has been submitted. A Government "
                                     "Official will review and activate your account "
                                     "before you can sign in.")
        raise HTTPException(403, "Your account is pending approval by a Government Official.")

    new_version = user["token_version"] + 1
    db.execute("UPDATE users SET token_version=? WHERE id=?", (new_version, user["id"]))
    return {"token": make_token(user["id"], user["email"], new_version),
            "user": _public_user(user)}


@router.post("/api/auth/login")
def login(body: LoginIn):
    """Only one active session per account: logging in bumps token_version,
    which invalidates whatever token an earlier login issued."""
    email = body.email.strip().lower()
    user = db.query_one("SELECT * FROM users WHERE email=?", (email,))
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Email or password is incorrect")
    if user["status"] != "active":
        raise HTTPException(403, "Your account is pending approval by a Government Official.")
    new_version = user["token_version"] + 1
    db.execute("UPDATE users SET token_version=? WHERE id=?", (new_version, user["id"]))
    return {"token": make_token(user["id"], user["email"], new_version),
            "user": _public_user(user)}


@router.post("/api/auth/logout")
def logout(user=Depends(current_user)):
    db.execute("UPDATE users SET token_version = token_version + 1 WHERE id=?",
              (user["id"],))
    return {"ok": True}


@router.get("/api/me")
def me(user=Depends(current_user)):
    if user["role"] == "bidder":
        return {"user": _public_user(user), "profile": get_profile(user["id"])}
    return {"user": _public_user(user), "org_profile": get_org_profile(user["id"])}


@router.put("/api/profile")
def update_profile(body: dict, user=Depends(current_user)):
    if user["role"] != "bidder":
        raise HTTPException(403, "Only bidder accounts have a company profile")
    fields = ["udyam_no", "msme_class", "bidder_class", "turnover_cr",
              "experience_years", "max_similar_work_cr", "working_capital_cr",
              "overhead_pct", "target_margin_pct"]
    sets, params = [], []
    for f in fields:
        if f in body:
            sets.append(f"{f}=?")
            params.append(body[f])
    for f in ["certifications", "states", "categories"]:
        if f in body:
            sets.append(f"{f}=?")
            params.append(json.dumps(body[f]))
    if body.get("company_name"):
        db.execute("UPDATE users SET company_name=? WHERE id=?",
                   (body["company_name"], user["id"]))
    if sets:
        params.append(user["id"])
        db.execute(f"UPDATE profiles SET {','.join(sets)} WHERE user_id=?", params)
    return {"profile": get_profile(user["id"])}


@router.put("/api/org-profile")
def update_org_profile(body: dict, user=Depends(current_user)):
    if user["role"] != "government":
        raise HTTPException(403, "Only government accounts have an org profile")
    fields = ["org_name", "department", "state", "designation"]
    sets, params = [], []
    for f in fields:
        if f in body:
            sets.append(f"{f}=?")
            params.append(body[f])
    if body.get("company_name"):
        db.execute("UPDATE users SET company_name=? WHERE id=?",
                   (body["company_name"], user["id"]))
    if sets:
        params.append(user["id"])
        db.execute(f"UPDATE org_profiles SET {','.join(sets)} WHERE user_id=?", params)
    return {"org_profile": get_org_profile(user["id"])}


class RequestResetIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str


@router.post("/api/auth/request-password-reset")
def request_password_reset(body: RequestResetIn):
    email = body.email.strip().lower()
    user = db.query_one("SELECT id,email FROM users WHERE email=?", (email,))
    if user:
        token = make_action_token("reset_password", user["id"])
        link = f"/reset-password?token={token}"
        send_mail(user["email"], "Reset your BidVector password",
                 f"Reset your password by visiting: {link}\nThis link expires in 1 hour. "
                 f"If you didn't request this, ignore this email.")
    return {"ok": True}


@router.post("/api/auth/reset-password")
def reset_password(body: ResetPasswordIn):
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    payload = read_action_token(body.token, "reset_password")
    if not payload:
        raise HTTPException(400, "This reset link is invalid or has expired")
    db.execute("""UPDATE users SET password_hash=?, token_version=token_version+1
                 WHERE id=?""", (hash_password(body.password), payload["uid"]))
    return {"ok": True}


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


@router.post("/api/auth/change-password")
def change_password(body: ChangePasswordIn, user=Depends(current_user)):
    if len(body.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    row = db.query_one("SELECT password_hash FROM users WHERE id=?", (user["id"],))
    if not verify_password(body.current_password, row["password_hash"]):
        raise HTTPException(401, "Current password is incorrect")
    new_version = user["token_version"] + 1
    db.execute("UPDATE users SET password_hash=?, token_version=? WHERE id=?",
              (hash_password(body.new_password), new_version, user["id"]))
    return {"token": make_token(user["id"], user["email"], new_version)}
