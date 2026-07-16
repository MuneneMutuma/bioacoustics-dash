"""
ingestion/csv_source.py — today's DetectionSource implementation.

CsvTailer tracks a byte offset into a CSV file and reads only newly-appended
lines on each poll — equivalent to `tail -f` but portable across Linux, macOS,
and Windows (no inotify, no fcntl).

CsvFileSource wraps two tailers (inferences.csv + events.csv) and auto-retargets
them when a new run directory appears under RUNS_DIR.

Safe concurrent access: Linux/macOS/Windows all allow a reader to seek/read a
file while another process appends to it.  We'll only ever see complete lines
that were already flushed, which is guaranteed by flush_csv_every_write: true
in config.yaml (already set).
"""
from __future__ import annotations
import asyncio
import csv
import io
import logging
from pathlib import Path
from typing import AsyncIterator

from ..config import RUNS_DIR, POLL_SECONDS
from ..models import DetectionEvent
from ..run_registry import latest_run, run_csv_dir

logger = logging.getLogger("piwild.csv_source")

# ---------------------------------------------------------------------------
# CSV column headers — must match inference.py exactly
# ---------------------------------------------------------------------------
INFERENCE_HEADER = [
    "timestamp_utc", "window_start_sample", "window_end_sample",
    "class_id", "common_name", "scientific_name", "score",
    "event_id", "event_state", "latency_ms",
]

EVENT_HEADER = [
    "event_id", "start_sample", "end_sample", "start_utc", "end_utc",
    "peak_class_id", "peak_common_name", "peak_score",
]


class CsvTailer:
    """Reads only newly-appended rows from a CSV, tracking a byte offset."""

    def __init__(self, path: Path, header: list[str]) -> None:
        self.path = path
        self.header = header
        self.offset: int = 0

    def read_new_rows(self) -> list[dict]:
        if not self.path.exists():
            return []
        try:
            with open(self.path, "r", newline="", encoding="utf-8") as f:
                f.seek(self.offset)
                chunk = f.read()
                self.offset = f.tell()
        except OSError as exc:
            logger.warning("Could not read %s: %s", self.path, exc)
            return []

        if not chunk:
            return []

        rows: list[dict] = []
        reader = csv.reader(io.StringIO(chunk))
        for fields in reader:
            # Skip malformed rows and the header (if offset was 0 and we read it)
            if len(fields) == len(self.header):
                rows.append(dict(zip(self.header, fields)))
        return rows

    def reset(self) -> None:
        """Called when we retarget to a new file."""
        self.offset = 0


class CsvFileSource:
    """
    Implements DetectionSource by tailing the inferences.csv of the
    currently-active run directory.

    Auto-detects new run directories: if latest_run() changes between polls,
    the tailers switch to the new run and a 'run_started' sentinel dict is
    yielded first so the broadcaster can notify connected clients.
    """

    async def events(self) -> AsyncIterator[dict]:  # type: ignore[override]
        """Yields dicts — either DetectionEvent.model_dump() or sentinel messages."""
        current_run: str | None = None
        inf_tailer: CsvTailer | None = None
        evt_tailer: CsvTailer | None = None

        while True:
            run_id = latest_run()

            # Detect run change
            if run_id and run_id != current_run:
                current_run = run_id
                csv_dir = run_csv_dir(run_id)
                inf_tailer = CsvTailer(csv_dir / "inferences.csv", INFERENCE_HEADER)
                evt_tailer = CsvTailer(csv_dir / "events.csv", EVENT_HEADER)
                logger.info("Switched to run: %s", run_id)
                yield {"type": "run_started", "run_id": run_id}

            if inf_tailer:
                for row in inf_tailer.read_new_rows():
                    try:
                        score = float(row.get("score", 0.0))
                    except (ValueError, TypeError):
                        score = 0.0
                    yield {
                        "type": "inference",
                        "run_id": current_run,
                        **row,
                        "score": score,
                    }

            if evt_tailer:
                for row in evt_tailer.read_new_rows():
                    try:
                        peak_score = float(row.get("peak_score", 0.0))
                    except (ValueError, TypeError):
                        peak_score = 0.0
                    yield {
                        "type": "event_complete",
                        "run_id": current_run,
                        **row,
                        "peak_score": peak_score,
                    }

            await asyncio.sleep(POLL_SECONDS)
