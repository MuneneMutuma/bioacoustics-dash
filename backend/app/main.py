"""
main.py — FastAPI application entry point.

Startup:
  - Launches the watcher background task (watch_loop)
  - Registers all routers
  - Mounts the built frontend as static files at "/"

For development (npm run dev + uvicorn side-by-side), the static mount can be
skipped — Vite proxies /api and /ws to the FastAPI server.

Run:
  cd dashboard/backend
  uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload

With sshfs mount (Linux/macOS):
  PERCH_RUNS_DIR=/mnt/pi-runs uvicorn app.main:app --host 0.0.0.0 --port 8080

With sshfs mount (Windows, WinFsp):
  set PERCH_RUNS_DIR=Z:\\runs
  uvicorn app.main:app --host 0.0.0.0 --port 8080
"""
from __future__ import annotations
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .watcher import watch_loop
from .routers import live, history

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("piwild")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the watcher on startup, cancel it gracefully on shutdown."""
    task = asyncio.create_task(watch_loop(), name="piwild-watcher")
    logger.info("PiWild backend started")
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        logger.info("PiWild backend shutdown complete")


app = FastAPI(
    title="PiWild Detection Dashboard",
    description="Real-time bioacoustics detection dashboard for the Raspberry Pi edge listener.",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow Vite dev server (port 5173) to call the backend without CORS errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev
        "http://127.0.0.1:5173",
        "http://localhost:8080",   # served-static mode
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(live.router)
app.include_router(history.router)

# Mount the built frontend. Only do this if the static dir exists —
# during dev we use `npm run dev` + Vite proxy instead.
_static_dir = Path(__file__).parent / "static"
if _static_dir.exists():
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="frontend")
    logger.info("Serving frontend from %s", _static_dir)
else:
    logger.info(
        "No static/ dir found — run `npm run build` in frontend/ and copy dist/ to "
        "backend/app/static/ for production mode. Using Vite dev server for development."
    )
