"""
routers/history.py — analytics/history REST endpoints.

All endpoints read pre-written CSVs via the analytics module.
They work whether or not inference.py is currently active.

Adding a new chart:
  1. Write a pandas function in analytics.py
  2. Add one route here
  3. Add one React chart component
  Nothing else changes.
"""
from __future__ import annotations
import logging

from fastapi import APIRouter, HTTPException, Query

from ..run_registry import list_runs, run_exists, run_summary
from .. import analytics

router = APIRouter(prefix="/api/runs")
logger = logging.getLogger("piwild.history")


def _check_run(run_id: str) -> None:
    if not run_exists(run_id):
        raise HTTPException(status_code=404, detail=f"Run not found: {run_id}")


@router.get("")
def runs():
    """List all run IDs, newest first."""
    return list_runs()


@router.get("/{run_id}")
def run_detail(run_id: str):
    """Metadata / summary for a single run."""
    _check_run(run_id)
    return run_summary(run_id).model_dump()


@router.get("/{run_id}/species-frequency")
def species_frequency(
    run_id: str,
    threshold: float = Query(default=0.5, ge=0.0, le=1.0),
):
    """Top species by detection count, filtered by confidence threshold."""
    _check_run(run_id)
    try:
        return analytics.species_frequency(run_id, threshold)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{run_id}/timeline")
def timeline(run_id: str):
    """Detections grouped by hour and species."""
    _check_run(run_id)
    try:
        return analytics.detection_timeline(run_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{run_id}/confidence")
def confidence(
    run_id: str,
    bins: int = Query(default=20, ge=5, le=100),
):
    """Confidence score distribution histogram."""
    _check_run(run_id)
    try:
        return analytics.confidence_distribution(run_id, bins)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{run_id}/profile")
def profile(run_id: str):
    """System resource usage over the run."""
    _check_run(run_id)
    try:
        return analytics.system_profile(run_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{run_id}/events")
def events(run_id: str):
    """Completed detection events (from events.csv)."""
    _check_run(run_id)
    return analytics.events_list(run_id)


@router.get("/{run_id}/top-detections")
def top_detections(
    run_id: str,
    limit: int = Query(default=20, ge=1, le=200),
    threshold: float = Query(default=0.3, ge=0.0, le=1.0),
):
    """Top N individual detections by confidence score."""
    _check_run(run_id)
    try:
        return analytics.top_detections(run_id, limit, threshold)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{run_id}/events/{event_id}/detections")
def event_detections(run_id: str, event_id: int):
    """All inference rows within a specific event."""
    _check_run(run_id)
    try:
        return analytics.event_detections(run_id, event_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
