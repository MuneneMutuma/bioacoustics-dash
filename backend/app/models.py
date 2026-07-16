"""
models.py — Pydantic schemas that mirror the CSV headers written by inference.py.

These are used for:
  - WebSocket broadcast payloads (DetectionEvent, EventRecord)
  - REST API response serialization
  - Type safety in the analytics layer

Column names match the CSV headers exactly so dict(zip(header, row)) can be
passed directly to these models without any field renaming.
"""
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class DetectionEvent(BaseModel):
    """One row from inferences.csv, enriched with the run_id."""
    run_id: str
    timestamp_utc: str
    window_start_sample: str
    window_end_sample: str
    class_id: str
    common_name: str
    scientific_name: str = ""
    score: float
    event_id: str = ""
    event_state: str = "NONE"   # NONE | START | UPDATE | END
    latency_ms: str = ""

    @classmethod
    def from_csv_row(cls, row: dict, run_id: str) -> "DetectionEvent":
        return cls(
            run_id=run_id,
            score=float(row.get("score", 0.0)),
            **{k: v for k, v in row.items() if k != "score"},
        )


class EventRecord(BaseModel):
    """One row from events.csv — a completed detection event."""
    run_id: str
    event_id: str
    start_sample: str
    end_sample: str
    start_utc: str
    end_utc: str
    peak_class_id: str
    peak_common_name: str
    peak_score: float

    @classmethod
    def from_csv_row(cls, row: dict, run_id: str) -> "EventRecord":
        return cls(
            run_id=run_id,
            peak_score=float(row.get("peak_score", 0.0)),
            **{k: v for k, v in row.items() if k != "peak_score"},
        )


class RunSummary(BaseModel):
    """Metadata about a single run directory."""
    run_id: str
    has_inferences: bool
    has_events: bool
    has_profile: bool
    inference_row_count: Optional[int] = None


class StatusResponse(BaseModel):
    current_run: Optional[str]
    connected_clients: int
    runs_dir: str
