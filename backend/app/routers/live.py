"""
routers/live.py — real-time endpoints.

GET  /api/status      → current run + connected client count (polling fallback)
WS   /ws/live         → streaming JSON messages for every new detection
"""
from __future__ import annotations
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..broadcaster import broadcaster
from ..run_registry import latest_run
from ..config import RUNS_DIR

router = APIRouter()
logger = logging.getLogger("piwild.live")


@router.get("/api/status")
async def status():
    """Lightweight health / current-state endpoint.

    Used by the frontend to populate the connection indicator and to know
    which run to show in the Live view header.
    """
    return {
        "current_run": latest_run(),
        "connected_clients": broadcaster.client_count,
        "runs_dir": str(RUNS_DIR),
        "runs_dir_exists": RUNS_DIR.exists(),
    }


@router.websocket("/ws/live")
async def live_ws(ws: WebSocket):
    """
    WebSocket endpoint. One connection per browser tab.

    The client sends periodic text pings to keep the connection alive through
    load-balancers / firewalls; we ignore the payload.
    """
    await broadcaster.connect(ws)
    logger.info("WebSocket client connected (total: %d)", broadcaster.client_count)
    try:
        while True:
            # Receive keepalive pings from the client; payload is discarded.
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await broadcaster.disconnect(ws)
        logger.info("WebSocket client disconnected (remaining: %d)", broadcaster.client_count)
