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
from pathlib import Path

import pandas as pd

from .run_registry import run_csv_dir

logger = logging.getLogger("piwild.analytics")


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    """
    Serialize a DataFrame to list[dict], safely converting NaN/inf/numpy
    floats to JSON-compatible None.  Uses pandas' own JSON encoder
    (which handles all numpy types) then round-trips through json.loads.
    """
    return json.loads(df.to_json(orient="records"))


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
    """Detection counts grouped by 5-minute window and species."""
    df = _load_inferences(run_id)
    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True, errors="coerce")
    df = df.dropna(subset=["timestamp_utc"])
    df["bucket"] = df["timestamp_utc"].dt.floor("5min").dt.strftime("%Y-%m-%dT%H:%M:%S+00:00")
    grouped = df.groupby(["bucket", "common_name"]).size().reset_index(name="count")
    grouped = grouped.rename(columns={"bucket": "hour"})
    return grouped.to_dict(orient="records")


def confidence_distribution(run_id: str, bins: int = 20) -> list[dict]:
    """Histogram of confidence scores across all detections."""
    df = _load_inferences(run_id)
    scores = df["score"].dropna()
    if scores.empty:
        return []

    # Create bin edges and labels
    hist, edges = pd.cut(scores, bins=bins, retbins=True)
    df["bin"] = pd.cut(df["score"], bins=edges)

    results = []
    for (e0, e1), bin_label in zip(zip(edges[:-1], edges[1:]), sorted(df["bin"].dropna().unique())):
        bin_df = df[df["bin"] == bin_label]
        count = len(bin_df)

        # Get top species for this bin
        species_counts = {}
        if count > 0:
            top_species = bin_df["common_name"].value_counts().head(5)
            species_counts = top_species.to_dict()

        results.append({
            "bin_start": float(e0),
            "bin_end": float(e1),
            "count": int(count),
            "species": species_counts
        })

    return results


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
    return _df_to_records(df)


def events_list(run_id: str) -> list[dict]:
    """All completed detection events for a run."""
    path = run_csv_dir(run_id) / "events.csv"
    if not path.exists():
        return []
    df = pd.read_csv(path)
    df["peak_score"] = pd.to_numeric(df["peak_score"], errors="coerce").fillna(0.0)
    return _df_to_records(df)


def top_detections(run_id: str, limit: int = 20, threshold: float = 0.3) -> list[dict]:
    """Top N individual inference rows by score, above threshold."""
    df = _load_inferences(run_id)
    df = df[df["score"] >= threshold].nlargest(limit, "score")
    return _df_to_records(df)


def event_detections(run_id: str, event_id: int) -> list[dict]:
    """
    Return all inference rows that belong to a given event_id.

    Strategy:
    1. Try matching on the event_id column in inferences.csv (only set on START rows).
    2. Fall back to a time-range join using start_utc / end_utc from events.csv.
       This captures UPDATE/END/NONE rows that happen within the event window.
    """
    df = _load_inferences(run_id)

    # --- Method 1: direct event_id column match (covers START rows) ---
    matched_rows = pd.DataFrame()
    if "event_id" in df.columns:
        # event_id is empty string for non-event rows; coerce to numeric
        df["_eid_num"] = pd.to_numeric(df["event_id"], errors="coerce")
        matched_rows = df[df["_eid_num"] == event_id].copy()

    # --- Method 2: time-range join (covers ALL rows in the event window) ---
    events_path = run_csv_dir(run_id) / "events.csv"
    if events_path.exists():
        try:
            ev_df = pd.read_csv(events_path)
            ev_df["_eid_num"] = pd.to_numeric(ev_df["event_id"], errors="coerce")
            event_row = ev_df[ev_df["_eid_num"] == event_id]

            if not event_row.empty:
                start_utc = event_row.iloc[0]["start_utc"]
                end_utc   = event_row.iloc[0]["end_utc"]

                df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True, errors="coerce")
                start = pd.to_datetime(start_utc, utc=True)
                end   = pd.to_datetime(end_utc,   utc=True)

                # Add a small grace window (±5 s) to catch border rows
                grace = pd.Timedelta(seconds=5)
                time_rows = df[
                    (df["timestamp_utc"] >= start - grace) &
                    (df["timestamp_utc"] <= end   + grace)
                ].copy()

                # Merge: union of direct match + time-range rows
                if not matched_rows.empty:
                    combined = pd.concat([matched_rows, time_rows]).drop_duplicates()
                else:
                    combined = time_rows

                combined = combined.sort_values("timestamp_utc")
                combined = combined.drop(columns=["_eid_num"], errors="ignore")
                return _df_to_records(combined)
        except Exception as exc:
            logger.warning("event_detections fallback failed: %s", exc)

    # Return direct match only if time-range failed
    if not matched_rows.empty:
        matched_rows = matched_rows.drop(columns=["_eid_num"], errors="ignore")
        return _df_to_records(matched_rows.sort_values("timestamp_utc"))

    return []
