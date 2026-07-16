"""
broadcaster.py — WebSocket fan-out manager.

One Broadcaster singleton is shared across the app. The watcher task calls
broadcast() for every new CSV row; the /ws/live endpoint registers/deregisters
each browser connection.

Thread-safety: all operations are async; the asyncio event loop serialises them.
"""
from __future__ import annotations
import asyncio
import logging
from fastapi import WebSocket

logger = logging.getLogger("piwild.broadcaster")


class Broadcaster:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    @property
    def client_count(self) -> int:
        return len(self._clients)

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.add(ws)
        logger.debug("WS client connected (%d total)", len(self._clients))

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(ws)
        logger.debug("WS client disconnected (%d remaining)", len(self._clients))

    async def broadcast(self, message: dict) -> None:
        """Send message to all connected clients; silently drop dead connections."""
        if not self._clients:
            return
        dead: list[WebSocket] = []
        for ws in list(self._clients):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)


# Module-level singleton — imported by watcher.py and routers/live.py
broadcaster = Broadcaster()
