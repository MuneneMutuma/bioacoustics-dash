"""
watcher.py — background asyncio task that drives the ingestion source
and fans out each event to all connected WebSocket clients via the broadcaster.

The watch_loop() coroutine is started once at app startup (see main.py lifespan).
It loops forever until cancelled on shutdown.

Source selection:
  PIWILD_SOURCE=csv   (default) → CsvFileSource
  PIWILD_SOURCE=lorawan          → raise NotImplementedError (stub only)
"""
from __future__ import annotations
import asyncio
import logging
import os

from .broadcaster import broadcaster
from .ingestion.csv_source import CsvFileSource

logger = logging.getLogger("piwild.watcher")


def _build_source():
    source_name = os.getenv("PIWILD_SOURCE", "csv").lower()
    if source_name == "csv":
        return CsvFileSource()
    # LoRaWAN source is not built yet — stub shown for future swap point
    # elif source_name == "lorawan":
    #     from .ingestion.lorawan_source import LoRaWANSource
    #     return LoRaWANSource()
    raise ValueError(f"Unknown PIWILD_SOURCE: {source_name!r}. Only 'csv' is supported.")


async def watch_loop() -> None:
    """
    Infinite loop: pull events from the active DetectionSource and broadcast
    them to all connected WebSocket clients.

    Runs as a background asyncio.Task; cancelled cleanly on app shutdown.
    """
    source = _build_source()
    logger.info("Watcher started (source=%s)", os.getenv("PIWILD_SOURCE", "csv"))

    try:
        async for message in source.events():
            await broadcaster.broadcast(message)
    except asyncio.CancelledError:
        logger.info("Watcher task cancelled — shutting down")
        raise
    except Exception as exc:
        logger.exception("Watcher crashed: %s", exc)
        raise
