"""FastAPI dependencies: per-request DB handle, bearer-token auth, role gates."""

from fastapi import Depends, Header, HTTPException

from . import db
from .auth import read_token


def _bearer(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


def current_user_optional(authorization: str | None = Header(default=None)):
    payload = read_token(_bearer(authorization))
    if not payload:
        return None
    user = db.query_one(
        "SELECT id,email,company_name,role,token_version FROM users WHERE id=?",
        (payload["uid"],))
    if not user:
        return None
    if payload.get("tv", 0) != user["token_version"]:
        return None
    return user


def current_user(user=Depends(current_user_optional)):
    if not user:
        raise HTTPException(401, "Sign in to continue")
    return user


def require_role(*roles):
    def _dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Not permitted for this account type")
        return user
    return _dep
