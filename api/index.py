"""Vercel FastAPI entrypoint.

Vercel detects the exported `app` at this supported path and serves API paths
under `/api/*`. The underlying service also keeps unprefixed routes for local
Uvicorn development.
"""
from backend.app.main import app  # noqa: F401
