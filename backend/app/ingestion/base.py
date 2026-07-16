"""
ingestion/base.py — the adapter boundary between "how do detections arrive"
and "what the rest of the backend does with them".

Today:   CsvFileSource — tails sshfs-mounted (or local) CSV files.
Later:   LoRaWANSource — subscribes to TTN MQTT/webhook, decodes the binary
         payload that lora_transmission.py already sends:
         struct.pack("<BHHB", state_byte, event_id, class_id, score_byte)

Swapping sources is a one-line change in main.py (env var); nothing downstream
(broadcaster, analytics, frontend) changes.
"""
from __future__ import annotations
from typing import AsyncIterator, Protocol, runtime_checkable
from ..models import DetectionEvent


@runtime_checkable
class DetectionSource(Protocol):
    """Anything that can produce a stream of DetectionEvents.

    Implementors must define an ``events()`` async generator that yields
    DetectionEvent instances indefinitely (or until cancelled).
    """

    async def events(self) -> AsyncIterator[DetectionEvent]:
        ...  # pragma: no cover
