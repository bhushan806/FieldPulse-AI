"""
backend/app/services/time_machine_backfill.py
Safe, idempotent backfill utility for AI Site Time Machine.
Reconstructs historical events from existing database records (captures, activities, issues)
without fabricating synthetic facts or corrupting source collections.
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from bson import ObjectId

from app.db.mongo import (
    get_activities_collection,
    get_captures_collection,
    get_database,
)
from app.models.activity import ScheduleActivityInDB
from app.models.activity_event import EventType
from app.services.activity_event_service import activity_event_service


async def run_time_machine_backfill(project_id: Optional[str] = None) -> Dict[str, int]:
    """
    Backfills existing records into the `activity_events` event store idempotently.
    Can be run safely at startup or via CLI script.
    """
    act_col = get_activities_collection()
    cap_col = get_captures_collection()
    issues_col = get_database()["issues"]

    query: Dict[str, Any] = {}
    if project_id:
        query["project_id"] = project_id

    stats = {
        "activities_processed": 0,
        "captures_processed": 0,
        "issues_processed": 0,
        "events_created": 0,
    }

    # 1. Backfill Schedule Activities
    act_cursor = act_col.find(query)
    activities = await act_cursor.to_list(length=None)

    for act_doc in activities:
        act_id = str(act_doc["_id"])
        pid = act_doc.get("project_id")
        stats["activities_processed"] += 1

        # Record baseline snapshot if none exists
        latest_bl = await activity_event_service.get_latest_baseline(act_id)
        if not latest_bl and act_doc.get("planned_start") and act_doc.get("planned_end"):
            await activity_event_service.record_schedule_baseline(
                project_id=pid,
                activity_id=act_id,
                planned_start=act_doc["planned_start"],
                planned_end=act_doc["planned_end"],
                planned_quantity=act_doc.get("planned_quantity"),
                quantity_unit=act_doc.get("quantity_unit"),
                dependencies=act_doc.get("dependencies", []),
                notes="Initial baseline snapshot backfilled from schedule activity creation.",
            )

        # Create ACTIVITY_CREATED event
        ev_time = act_doc.get("created_at") or act_doc.get("planned_start") or datetime.now(timezone.utc)
        ev = await activity_event_service.create_event(
            project_id=pid,
            activity_id=act_id,
            event_type=EventType.ACTIVITY_CREATED,
            source_type="BACKFILLED_FROM_SCHEDULE",
            source_id=act_id,
            timestamp=ev_time,
            description=f"Activity initialized: {act_doc.get('activity_code')} - {act_doc.get('activity_name')}",
            progress_after=0.0,
            metadata={"keywords": act_doc.get("keywords", [])},
        )
        if ev:
            stats["events_created"] += 1

    # 2. Backfill Captures
    cap_query: Dict[str, Any] = {"matched_activity_id": {"$ne": None}}
    if project_id:
        cap_query["project_id"] = project_id

    cap_cursor = cap_col.find(cap_query).sort("created_at", 1)
    captures = await cap_cursor.to_list(length=None)

    for cap in captures:
        cap_id = str(cap["_id"])
        act_id = cap.get("matched_activity_id")
        pid = cap.get("project_id")
        if not act_id or not pid:
            continue

        stats["captures_processed"] += 1
        m_type = cap.get("media_type", "photo")
        cap_time = cap.get("created_at") or datetime.now(timezone.utc)
        conf = float(cap.get("confidence_score") or 0.0)

        # Base evidence event
        if m_type == "photo":
            ev_type = EventType.PHOTO_CAPTURED
            cv = cap.get("cv_classification") or {}
            desc = f"Field photo analyzed (CV label: {cv.get('label', 'Site inspection')})"
        elif m_type == "voice":
            ev_type = EventType.VOICE_UPDATE
            transcript = cap.get("transcribed_text") or "Site voice note recorded"
            desc = f"Voice note: \"{transcript[:100]}\""
        elif m_type == "video":
            ev_type = EventType.VIDEO_CAPTURED
            desc = "Site video evidence captured"
        elif m_type == "qr":
            ev_type = EventType.QR_SCAN
            desc = f"Activity QR scan validated: {cap.get('qr_code_value')}"
        else:
            ev_type = EventType.WORKER_UPDATE
            desc = "Worker field submission"

        await activity_event_service.create_event(
            project_id=pid,
            activity_id=act_id,
            event_type=ev_type,
            source_type="BACKFILLED_FROM_CAPTURE",
            source_id=cap_id,
            actor_id=cap.get("user_id"),
            timestamp=cap_time,
            description=desc,
            confidence=conf,
            evidence_ids=[cap_id],
            metadata={
                "media_url": cap.get("media_url"),
                "gps": cap.get("gps"),
                "status": cap.get("status"),
            },
        )
        stats["events_created"] += 1

        # If approved / auto_approved, also record progress update event
        if cap.get("status") in ("auto_approved", "approved"):
            await activity_event_service.create_event(
                project_id=pid,
                activity_id=act_id,
                event_type=EventType.PROGRESS_UPDATE,
                source_type="PHOTO_AI" if m_type == "photo" else "FIELD_CAPTURE",
                source_id=cap_id,
                actor_id=cap.get("user_id"),
                timestamp=cap_time,
                description=f"Progress verified from {m_type} evidence (Status: {cap.get('status')})",
                confidence=conf,
                evidence_ids=[cap_id],
                metadata={"status": cap.get("status")},
            )
            stats["events_created"] += 1

    # 3. Backfill Issues
    issue_query: Dict[str, Any] = {"activity_id": {"$ne": None}}
    if project_id:
        issue_query["project_id"] = project_id

    issue_cursor = issues_col.find(issue_query).sort("created_at", 1)
    issues = await issue_cursor.to_list(length=None)

    for issue in issues:
        issue_id = str(issue["_id"])
        act_id = issue.get("activity_id")
        pid = issue.get("project_id")
        if not act_id or not pid:
            continue

        stats["issues_processed"] += 1
        title = issue.get("title", "")
        desc = issue.get("description", "")
        full_text = f"{title} {desc}".lower()

        # Classify issue event type
        if any(k in full_text for k in ["equipment", "excavator", "crane", "generator", "breakdown", "machine"]):
            ev_type = EventType.EQUIPMENT_ISSUE
        elif any(k in full_text for k in ["material", "cement", "concrete", "steel", "pipe", "shortage", "rebar"]):
            ev_type = EventType.MATERIAL_ISSUE
        elif any(k in full_text for k in ["weather", "rain", "monsoon", "flood", "storm"]):
            ev_type = EventType.WEATHER_DELAY
        elif any(k in full_text for k in ["safety", "hazard", "incident", "ppe"]):
            ev_type = EventType.SAFETY_ISSUE
        else:
            ev_type = EventType.CORRECTIVE_ACTION_CREATED

        await activity_event_service.create_event(
            project_id=pid,
            activity_id=act_id,
            event_type=ev_type,
            source_type="BACKFILLED_FROM_ISSUE",
            source_id=issue_id,
            actor_id=issue.get("created_by"),
            timestamp=issue.get("created_at") or datetime.now(timezone.utc),
            description=f"Field Issue [{issue.get('severity', 'medium').upper()}]: {title}",
            evidence_ids=issue.get("evidence_capture_ids", []),
            metadata={"status": issue.get("status"), "severity": issue.get("severity")},
        )
        stats["events_created"] += 1

        if issue.get("status") == "resolved" and issue.get("resolved_at"):
            await activity_event_service.create_event(
                project_id=pid,
                activity_id=act_id,
                event_type=EventType.CORRECTIVE_ACTION_RESOLVED,
                source_type="BACKFILLED_FROM_ISSUE",
                source_id=issue_id,
                actor_id=issue.get("assigned_to"),
                timestamp=issue["resolved_at"],
                description=f"Resolved field issue: {title}",
                metadata={"status": "resolved"},
            )
            stats["events_created"] += 1

    return stats
