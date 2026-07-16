"""
run_registry.py — discovers run directories and tracks which is "current".

Runs are named <YYYYMMDD_HHMMSS_utc> so lexicographic sort == chronological sort.
"Current" run = the most-recently-created directory; the watcher detects when
a new one appears and retargets itself automatically (see watcher.py).

No state is written here — this module is a pure read of the filesystem.
"""
from __future__ import annotations
from pathlib import Path
from typing import Optional

from .config import RUNS_DIR
from .models import RunSummary


def list_runs() -> list[str]:
    """Return all run IDs sorted newest-first."""
    if not RUNS_DIR.exists():
        return []
    return sorted(
        (d.name for d in RUNS_DIR.iterdir() if d.is_dir()),
        reverse=True,
    )


def latest_run() -> Optional[str]:
    runs = list_runs()
    return runs[0] if runs else None


def run_csv_dir(run_id: str) -> Path:
    return RUNS_DIR / run_id / "csv"


def run_exists(run_id: str) -> bool:
    return (RUNS_DIR / run_id).is_dir()


def run_summary(run_id: str) -> RunSummary:
    csv_dir = run_csv_dir(run_id)
    inf_path = csv_dir / "inferences.csv"
    row_count = None
    if inf_path.exists():
        # Count rows minus header without loading into memory
        try:
            with open(inf_path, "r", encoding="utf-8") as f:
                row_count = sum(1 for _ in f) - 1  # subtract header
        except OSError:
            pass
    return RunSummary(
        run_id=run_id,
        has_inferences=inf_path.exists(),
        has_events=(csv_dir / "events.csv").exists(),
        has_profile=(csv_dir / "profile.csv").exists(),
        inference_row_count=max(0, row_count) if row_count is not None else None,
    )
