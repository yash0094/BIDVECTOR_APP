"""
BidVector -- FastAPI application entry point.

Mounts every router, serves the built frontend (frontend/dist) as static
files with SPA fallback, and initialises/seeds the database on startup.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import db, seed as seeder
from .engine import pricing
from .routers import auth, bidder, government, public

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")

app = FastAPI(title="BidVector API")

_allowed_origins = [o.strip() for o in
                   os.environ.get("BIDVECTOR_ALLOWED_ORIGINS", "").split(",") if o.strip()]
if _allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

for r in (auth.router, bidder.bidder_router, bidder.open_router,
         government.router, public.router):
    app.include_router(r)


@app.on_event("startup")
def _startup():
    db.init_db()
    if not db.is_seeded():
        seeder.seed()
    pricing.clear_cache()


if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")),
              name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        candidate = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
