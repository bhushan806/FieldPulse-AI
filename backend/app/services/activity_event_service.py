"""
backend/app/services/activity_event_service.py
Central event service for AI Site Time Machine.
Handles deterministic event creation, idempotency, tamper-evident hash chaining,
schedule baselining, and filtered timeline queries.
"""
from datetime import datetime, timezone
import hashlib
import json
from typing import Any, Dict, List, Optional, Tuple
from bson import ObjectId
import pymongo
from pymongo.errors import DuplicateKeyError

from app.db.mongo import get_activity_events_collection, get_schedule_baselines_collection
from app.models.activity_event import (
    ActivityEventInDB,
    ActivityEventPublic,
    EventType,
    ScheduleBaselineInDB,
    ScheduleBaselinePublic,
)
from app.websocket.manager import ws_manager


def _ensure_utc(dt: Optional[datetime]) -> datetime:
    """Normalize datetime to timezone-aware UTC canonical representation."""
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _compute_idempotency_key(
    activity_id: str,
    event_type: str,
    source_id: Optional[str],
    timestamp: datetime,
) -> str:
    """Generates a deterministic idempotency key to prevent duplicate events."""
    raw = f"{activity_id}:{event_type}:{source_id or 'direct'}:{timestamp.isoformat()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _compute_integrity_hash(
    previous_hash: str,
    canonical_payload: dict,
) -> str:
    """
    Computes a cryptographic tamper-evident hash chaining to previous event.
    Provides verifiable, tamper-evident timeline history.
    """
    payload_str = json.dumps(canonical_payload, sort_keys=True, default=str)
    combined = f"{previous_hash}::{payload_str}"
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()


# Public aliases
compute_idempotency_key = _compute_idempotency_key
compute_integrity_hash = _compute_integrity_hash


class ActivityEventService:
    @staticmethod
    async def create_event(
        *,
        project_id: str,
        activity_id: str,
        event_type: EventType | str,
        source_type: str,
        timestamp: Optional[datetime] = None,
        source_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        description: Optional[str] = None,
        progress_before: Optional[float] = None,
        progress_after: Optional[float] = None,
        confidence: Optional[float] = None,
        evidence_ids: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        custom_idempotency_key: Optional[str] = None,
    ) -> ActivityEventPublic:
        """
        Creates and persists an event in the `activity_events` collection.
        Guarantees idempotency and chains a tamper-evident integrity hash.
        """
        col = get_activity_events_collection()
        canonical_time = _ensure_utc(timestamp)

        ev_type_val = event_type.value if isinstance(event_type, EventType) else str(event_type)

        idempotency_key = custom_idempotency_key or _compute_idempotency_key(
            activity_id=activity_id,
            event_type=ev_type_val,
            source_id=source_id,
            timestamp=canonical_time,
        )

        # Idempotency check: see if event already recorded
        existing = await col.find_one({"idempotency_key": idempotency_key})
        if existing:
            existing["id"] = str(existing.pop("_id"))
            return ActivityEventPublic(**existing)

        # Retrieve previous event to chain integrity hash
        last_event = await col.find_one(
            {"activity_id": activity_id},
            sort=[("timestamp", pymongo.DESCENDING)],
        )
        previous_hash = last_event.get("integrity_hash") if last_event else "GENESIS_ROOT"

        canonical_payload = {
            "project_id": project_id,
            "activity_id": activity_id,
            "event_type": ev_type_val,
            "source_type": source_type,
            "source_id": source_id,
            "actor_id": actor_id,
            "timestamp": canonical_time.isoformat(),
            "progress_after": progress_after,
            "confidence": confidence,
            "evidence_ids": sorted(evidence_ids or []),
        }
        integrity_hash = _compute_integrity_hash(previous_hash, canonical_payload)

        doc = {
            "_id": ObjectId(),
            "project_id": project_id,
            "activity_id": activity_id,
            "event_type": ev_type_val,
            "timestamp": canonical_time,
            "source_type": source_type,
            "source_id": source_id,
            "actor_id": actor_id,
            "description": description,
            "progress_before": progress_before,
            "progress_after": progress_after,
            "confidence": confidence,
            "evidence_ids": evidence_ids or [],
            "metadata": metadata or {},
            "integrity_hash": integrity_hash,
            "idempotency_key": idempotency_key,
            "created_at": datetime.now(timezone.utc),
        }

        try:
            await col.insert_one(doc)
        except DuplicateKeyError:
            # Concurrent insert with same idempotency_key
            existing = await col.find_one({"idempotency_key": idempotency_key})
            if existing:
                existing["id"] = str(existing.pop("_id"))
                return ActivityEventPublic(**existing)

        event_id = str(doc["_id"])

        # Broadcast via project WebSocket room for real-time reactivity
        try:
            await ws_manager.broadcast_to_project(
                project_id=project_id,
                event="new_activity_event",
                data={
                    "project_id": project_id,
                    "activity_id": activity_id,
                    "event_type": ev_type_val,
                    "event_id": event_id,
                },
            )
        except Exception as ws_err:
            print(f"[EventService] WebSocket broadcast skipped: {ws_err}")

        doc_out = dict(doc)
        doc_out["id"] = event_id
        doc_out.pop("_id", None)
        return ActivityEventPublic(**doc_out)

    @staticmethod
    async def get_activity_timeline(
        *,
        activity_id: str,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        event_type: Optional[str] = None,
        source_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[ActivityEventPublic], int]:
        """
        Retrieves paginated, filtered, chronologically ordered timeline events for an activity.
        """
        col = get_activity_events_collection()
        query: Dict[str, Any] = {"activity_id": activity_id}

        if from_date or to_date:
            date_filter: Dict[str, Any] = {}
            if from_date:
                date_filter["$gte"] = _ensure_utc(from_date)
            if to_date:
                date_filter["$lte"] = _ensure_utc(to_date)
            query["timestamp"] = date_filter

        if event_type:
            types = [t.strip() for t in event_type.split(",") if t.strip()]
            if len(types) == 1:
                query["event_type"] = types[0]
            elif len(types) > 1:
                query["event_type"] = {"$in": types}

        if source_type:
            sources = [s.strip() for s in source_type.split(",") if s.strip()]
            if len(sources) == 1:
                query["source_type"] = sources[0]
            elif len(sources) > 1:
                query["source_type"] = {"$in": sources}

        total = await col.count_documents(query)
        cursor = col.find(query).sort("timestamp", pymongo.ASCENDING).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)

        items: List[ActivityEventPublic] = []
        for d in docs:
            d["id"] = str(d.pop("_id"))
            items.append(ActivityEventPublic(**d))

        return items, total

    @staticmethod
    async def record_schedule_baseline(
        *,
        project_id: str,
        activity_id: str,
        planned_start: datetime,
        planned_end: datetime,
        planned_quantity: Optional[float] = None,
        quantity_unit: Optional[str] = None,
        dependencies: Optional[List[str]] = None,
        created_by: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> ScheduleBaselinePublic:
        """
        Records an immutable schedule baseline snapshot for historical accuracy.
        Ensures past timelines are evaluated against the version active at that time.
        """
        col = get_schedule_baselines_collection()
        last_baseline = await col.find_one(
            {"activity_id": activity_id},
            sort=[("version", pymongo.DESCENDING)],
        )
        version = (last_baseline["version"] + 1) if last_baseline else 1

        start_utc = _ensure_utc(planned_start)
        end_utc = _ensure_utc(planned_end)
        duration_days = max(1, (end_utc.date() - start_utc.date()).days)

        doc = {
            "_id": ObjectId(),
            "project_id": project_id,
            "activity_id": activity_id,
            "version": version,
            "planned_start": start_utc,
            "planned_end": end_utc,
            "planned_quantity": planned_quantity,
            "quantity_unit": quantity_unit,
            "baseline_duration_days": duration_days,
            "dependencies": dependencies or [],
            "created_at": datetime.now(timezone.utc),
            "created_by": created_by,
            "notes": notes,
        }

        await col.insert_one(doc)
        doc_out = dict(doc)
        doc_out["id"] = str(doc_out.pop("_id"))
        return ScheduleBaselinePublic(**doc_out)

    @staticmethod
    async def get_latest_baseline(activity_id: str) -> Optional[ScheduleBaselinePublic]:
        """Fetches the latest recorded baseline snapshot for an activity."""
        col = get_schedule_baselines_collection()
        doc = await col.find_one({"activity_id": activity_id}, sort=[("version", pymongo.DESCENDING)])
        if not doc:
            return None
        doc["id"] = str(doc.pop("_id"))
        return ScheduleBaselinePublic(**doc)


# Global singleton instance
activity_event_service = ActivityEventService()
