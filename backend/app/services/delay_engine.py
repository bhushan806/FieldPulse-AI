"""
backend/app/services/delay_engine.py
Deterministic delay calculation engine for AI Site Time Machine.
Compares baseline schedule vs actual progress vs current date vs forecast completion.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from app.models.activity import ScheduleActivityInDB


def compute_activity_delay(
    activity: ScheduleActivityInDB,
    reference_date: Optional[datetime] = None,
    baseline_override: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Computes schedule variance, delay in days, forecast finish date, and risk rating.
    Uses historical baseline values if available, otherwise current schedule.
    """
    now = reference_date or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    # Use baseline start/end if available, or override, or activity definition
    start = (
        (baseline_override.get("planned_start") if baseline_override else None)
        or activity.baseline_start
        or activity.planned_start
    )
    end = (
        (baseline_override.get("planned_end") if baseline_override else None)
        or activity.baseline_end
        or activity.planned_end
    )

    if start and start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end and end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)

    actual_percent = float(activity.percent_complete or 0.0)

    # If no valid dates are provided
    if not start or not end:
        return {
            "delay_days": 0,
            "schedule_variance": 0.0,
            "planned_percent": 0.0,
            "actual_percent": actual_percent,
            "forecast_finish": None,
            "risk_level": "LOW",
            "is_delayed": False,
        }

    total_duration_days = max(1, (end.date() - start.date()).days)

    # Calculate planned progress at current reference date
    if now.date() < start.date():
        planned_percent = 0.0
    elif now.date() >= end.date():
        planned_percent = 100.0
    else:
        elapsed_days = max(0, (now.date() - start.date()).days)
        planned_percent = min(100.0, round((elapsed_days / total_duration_days) * 100.0, 1))

    schedule_variance = round(planned_percent - actual_percent, 1)

    # Calculate burn rate and forecast finish
    remaining_work = max(0.0, 100.0 - actual_percent)
    days_since_start = max(1, (now.date() - start.date()).days)

    if actual_percent >= 100.0:
        forecast_finish = end
        delay_days = 0
    else:
        # Determine empirical daily progress rate
        if now.date() > start.date() and actual_percent > 0:
            daily_rate = max(0.2, actual_percent / days_since_start)
        else:
            daily_rate = 100.0 / total_duration_days

        days_needed = int(remaining_work / daily_rate)
        forecast_finish = now + timedelta(days=days_needed)

        # Calculate delay days
        if now.date() > end.date():
            # Activity is overdue
            overdue_days = (now.date() - end.date()).days
            rate_delay = max(0, (forecast_finish.date() - end.date()).days)
            delay_days = max(overdue_days, rate_delay)
        elif forecast_finish.date() > end.date():
            delay_days = (forecast_finish.date() - end.date()).days
        else:
            delay_days = 0

    # Risk level categorization
    critical = bool(activity.critical_path)
    if actual_percent >= 100.0:
        risk_level = "LOW"
    elif critical and delay_days > 0:
        risk_level = "CRITICAL"
    elif delay_days >= 3 or schedule_variance >= 20.0:
        risk_level = "HIGH"
    elif delay_days >= 1 or schedule_variance >= 10.0:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "delay_days": delay_days,
        "schedule_variance": schedule_variance,
        "planned_percent": planned_percent,
        "actual_percent": actual_percent,
        "planned_start": start.isoformat(),
        "planned_finish": end.isoformat(),
        "forecast_finish": forecast_finish.isoformat() if forecast_finish else None,
        "risk_level": risk_level,
        "is_delayed": delay_days > 0 or schedule_variance >= 10.0,
    }
