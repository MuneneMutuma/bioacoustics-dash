"""
analytics.py — pandas-based aggregations for the History view.

All functions load CSVs on demand for a specific run. They are never called
during active inference — only when a user opens the History tab and selects
a run. This keeps the live-view code path lightweight.

Adding a new chart = one function here + one route in routers/history.py +
one React component. Nothing else changes.
"""
from __future__ import annotations
import json
import logging
import math
from pathlib import Path

import pandas as pd

from .run_registry import run_csv_dir

logger = logging.getLogger("piwild.analytics")


def _safe_float(v):
    """Convert a value to float, returning None for NaN/inf."""
    try:
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return None


def _sanitize_records(records: list[dict]) -> list[dict]:
    """Replace NaN/inf floats with None so json.dumps doesn't crash."""
    out = []
    for row in records:
        clean = {}
        for k, v in row.items():
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                clean[k] = None
            else:
                clean[k] = v
        out.append(clean)
    return out


def _load_inferences(run_id: str) -> pd.DataFrame:
    path = run_csv_dir(run_id) / "inferences.csv"
    if not path.exists():
        raise FileNotFoundError(f"inferences.csv not found for run {run_id}")
    df = pd.read_csv(path)
    df["score"] = pd.to_numeric(df["score"], errors="coerce").fillna(0.0)
    return df


def species_frequency(run_id: str, threshold: float = 0.5) -> list[dict]:
    """Top species by detection count above the given confidence threshold."""
    df = _load_inferences(run_id)
    df = df[df["score"] >= threshold]
    if df.empty:
        return []
    counts = df["common_name"].value_counts().reset_index()
    counts.columns = ["common_name", "count"]
    return counts.to_dict(orient="records")


def detection_timeline(run_id: str) -> list[dict]:
    """Detection counts grouped by hour and species."""
    df = _load_inferences(run_id)
    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True, errors="coerce")
    df = df.dropna(subset=["timestamp_utc"])
    df["hour"] = df["timestamp_utc"].dt.floor("h").dt.strftime("%Y-%m-%dT%H:%M:%S+00:00")
    grouped = df.groupby(["hour", "common_name"]).size().reset_index(name="count")
    return grouped.to_dict(orient="records")


def confidence_distribution(run_id: str, bins: int = 20) -> list[dict]:
    """Histogram of confidence scores across all detections."""
    df = _load_inferences(run_id)
    scores = df["score"].dropna()
    if scores.empty:
        return []
    hist, edges = pd.cut(scores, bins=bins, retbins=True)
    counts = hist.value_counts(sort=False)
    return [
        {"bin_start": float(e0), "bin_end": float(e1), "count": int(c)}
        for (e0, e1), c in zip(zip(edges[:-1], edges[1:]), counts)
    ]


def system_profile(run_id: str) -> list[dict]:
    """System resource usage over the run (CPU, RAM, load averages)."""
    path = run_csv_dir(run_id) / "profile.csv"
    if not path.exists():
        raise FileNotFoundError(f"profile.csv not found for run {run_id}")
    df = pd.read_csv(path)
    numeric_cols = [
        "proc_cpu_percent", "proc_mem_mb", "system_cpu_percent",
        "system_ram_percent", "system_available_ram_mb",
        "load1", "load5", "load15",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return _sanitize_records(df.to_dict(orient="records"))


def events_list(run_id: str) -> list[dict]:
    """All completed detection events for a run."""
    path = run_csv_dir(run_id) / "events.csv"
    if not path.exists():
        return []
    df = pd.read_csv(path)
    df["peak_score"] = pd.to_numeric(df["peak_score"], errors="coerce").fillna(0.0)
    return df.to_dict(orient="records")


def top_detections(run_id: str, limit: int = 20, threshold: float = 0.3) -> list[dict]:
    """Top N individual inference rows by score, above threshold."""
    df = _load_inferences(run_id)
    df = df[df["score"] >= threshold].nlargest(limit, "score")
    return df.to_dict(orient="records")
