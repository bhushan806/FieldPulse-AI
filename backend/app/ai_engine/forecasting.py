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
    starts = [a.planned_start for a in activities if a.planned_start]
    ends = [a.planned_end for a in activities if a.planned_end]
    if not starts or not ends:
        return []
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
        planned_done = sum(1 for a in activities if a.planned_end and a.planned_end <= tick)
        planned_pct = round((planned_done / total) * 100, 2)

        # Actual: weighted average of percent_complete for activities that should have started
        active = [a for a in activities if a.planned_start and a.planned_start <= tick]
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
        if a.planned_end and a.planned_end < now and a.percent_complete < 100.0
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


# ---------------------------------------------------------------------------
# Automated Delay Alert Generation
# ---------------------------------------------------------------------------

async def sync_project_delay_alerts(project_id: str) -> List[dict]:
    """
    Checks for delayed activities in the project and creates notifications in the
    notifications collection if one has not already been created within the last 24 hours.
    Broadcasts 'new_alert' via WebSocket for newly generated alerts.
    """
    from app.db.mongo import get_activities_collection, get_notifications_collection
    from app.models.notification import AlertType
    from app.websocket.manager import ws_manager
    from bson import ObjectId

    act_col = get_activities_collection()
    notif_col = get_notifications_collection()

    docs = await act_col.find({"project_id": project_id}).to_list(length=None)
    activities = [ScheduleActivityInDB(**d) for d in docs]
    delayed = detect_delayed_activities(activities)

    created_alerts = []
    now = datetime.utcnow()
    one_day_ago = now - timedelta(days=1)

    for act in delayed:
        act_id_str = str(act.id)
        # Check if an alert was already created in last 24h
        existing = await notif_col.find_one({
            "project_id": project_id,
            "activity_id": act_id_str,
            "type": AlertType.delay.value,
            "created_at": {"$gte": one_day_ago}
        })
        if not existing:
            planned_end_str = act.planned_end.strftime("%Y-%m-%d") if act.planned_end else "N/A"
            message = (
                f"Activity {act.activity_code} ({act.activity_name}) is delayed past planned end date "
                f"{planned_end_str}. Current progress: {act.percent_complete}%."
            )
            doc = {
                "_id": ObjectId(),
                "project_id": project_id,
                "activity_id": act_id_str,
                "type": AlertType.delay.value,
                "message": message,
                "created_at": now,
                "read_by": []
            }
            await notif_col.insert_one(doc)
            notif_id = str(doc["_id"])
            doc_out = {
                "id": notif_id,
                "project_id": project_id,
                "activity_id": act_id_str,
                "type": AlertType.delay.value,
                "message": message,
                "created_at": now.isoformat(),
                "read_by": []
            }
            created_alerts.append(doc_out)

            # Time Machine: Emit AI_DELAY_DETECTED event
            try:
                from app.models.activity_event import EventType
                from app.services.activity_event_service import activity_event_service
                await activity_event_service.create_event(
                    project_id=project_id,
                    activity_id=act_id_str,
                    event_type=EventType.AI_DELAY_DETECTED,
                    source_type="DELAY_ENGINE",
                    source_id=notif_id,
                    timestamp=now,
                    description=f"Automated delay alert: {message}",
                    progress_after=act.percent_complete,
                    confidence=0.95,
                    metadata={"notification_id": notif_id, "planned_end": act.planned_end.isoformat() if act.planned_end else None},
                )
            except Exception as ev_exc:
                print(f"[Forecasting] Delay event recording failed: {ev_exc}")

            await ws_manager.broadcast_to_project(
                project_id=project_id,
                event="new_alert",
                data=doc_out
            )

    return created_alerts

