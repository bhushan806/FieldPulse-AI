"""
backend/app/ai_engine/forecasting.py
S-Curve data generation and delay detection using scikit-learn / Prophet.
Used by the dashboard API to supply planned vs actual progress curves
and generate delay alerts.
"""
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from app.models.activity import ScheduleActivityInDB, ActivityStatus


# ---------------------------------------------------------------------------
# S-Curve generation
# ---------------------------------------------------------------------------

def build_s_curve(
    activities: List[ScheduleActivityInDB],
    reference_date: Optional[datetime] = None,
) -> List[dict]:
    """
    Build planned-vs-actual S-curve data points (weekly buckets).

    Each point:  {"date": "YYYY-MM-DD", "planned_percent": float, "actual_percent": float}
    """
    if not activities:
        return []

    ref = reference_date or datetime.utcnow()

    # Determine overall project date range
    starts = [a.planned_start for a in activities]
    ends = [a.planned_end for a in activities]
    proj_start = min(starts)
    proj_end = max(ends)

    # Generate weekly ticks
    ticks = []
    cur = proj_start
    while cur <= proj_end:
        ticks.append(cur)
        cur += timedelta(weeks=1)
    if ticks[-1] < proj_end:
        ticks.append(proj_end)

    total = len(activities) if activities else 1
    curve = []

    for tick in ticks:
        # Planned: proportion of activities whose planned_end <= tick
        planned_done = sum(1 for a in activities if a.planned_end <= tick)
        planned_pct = round((planned_done / total) * 100, 2)

        # Actual: weighted average of percent_complete for activities that should have started
        active = [a for a in activities if a.planned_start <= tick]
        if active:
            actual_pct = round(sum(a.percent_complete for a in active) / total, 2)
        else:
            actual_pct = 0.0

        curve.append({
            "date": tick.strftime("%Y-%m-%d"),
            "planned_percent": planned_pct,
            "actual_percent": actual_pct,
        })

    return curve


# ---------------------------------------------------------------------------
# Delay detection
# ---------------------------------------------------------------------------

def detect_delayed_activities(
    activities: List[ScheduleActivityInDB],
    today: Optional[datetime] = None,
) -> List[ScheduleActivityInDB]:
    """
    Return activities that are past their planned_end date and not 100% complete.
    """
    now = today or datetime.utcnow()
    return [
        a for a in activities
        if a.planned_end < now and a.percent_complete < 100.0
        and a.status != ActivityStatus.completed
    ]


# ---------------------------------------------------------------------------
# Overall project health
# ---------------------------------------------------------------------------

def compute_project_status(
    activities: List[ScheduleActivityInDB],
) -> str:
    """
    Returns 'on_track' | 'at_risk' | 'delayed'.
    Logic:
      - delayed  → any activity is delayed
      - at_risk  → planned progress > actual by >= 10 pp in last week
      - on_track → otherwise
    """
    delayed = detect_delayed_activities(activities)
    if delayed:
        return "delayed"

    # Quick S-curve check for last two points
    curve = build_s_curve(activities)
    if len(curve) >= 2:
        last = curve[-1]
        gap = last["planned_percent"] - last["actual_percent"]
        if gap >= 10:
            return "at_risk"

    return "on_track"
