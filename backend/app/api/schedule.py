"""
backend/app/api/schedule.py
Schedule activity management endpoints.

GET  /api/schedule/               — list activities for a project
POST /api/schedule/               — create activity (PM+)
PUT  /api/schedule/{id}           — update activity (PM+)
"""
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.deps import get_current_user, require_pm, require_project_access
from app.db.mongo import get_activities_collection
from app.models.activity import ActivityStatus, ScheduleActivityInDB, ScheduleActivityPublic
from app.models.activity_event import EventType
from app.models._helpers import GeoPoint
from app.models.user import UserInDB, UserRole
from app.services.activity_event_service import activity_event_service
from app.services.audit import write_audit_log

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class ActivityCreate(BaseModel):
    project_id: str
    activity_code: str
    activity_name: str
    planned_start: datetime
    planned_end: datetime
    keywords: List[str] = []
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    planned_quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    dependencies: List[str] = []
    milestone: Optional[str] = None
    critical_path: bool = False


class ActivityUpdate(BaseModel):
    activity_name: Optional[str] = None
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    percent_complete: Optional[float] = None
    status: Optional[ActivityStatus] = None
    keywords: Optional[List[str]] = None
    planned_quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    dependencies: Optional[List[str]] = None
    milestone: Optional[str] = None
    critical_path: Optional[bool] = None


class ScheduleListResponse(BaseModel):
    items: List[ScheduleActivityPublic]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _doc_to_public(doc: dict) -> ScheduleActivityPublic:
    doc["id"] = str(doc.pop("_id"))
    return ScheduleActivityPublic(**doc)


# ---------------------------------------------------------------------------
# GET /api/schedule/
# ---------------------------------------------------------------------------

@router.get("/", response_model=ScheduleListResponse)
async def list_activities(
    project_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    require_project_access(current_user, project_id)
    col = get_activities_collection()
    cursor = col.find({"project_id": project_id}).sort("planned_start", 1)
    docs = await cursor.to_list(length=None)
    items = [_doc_to_public(d) for d in docs]
    return ScheduleListResponse(items=items)


# ---------------------------------------------------------------------------
# GET /api/schedule/{activity_id}
# ---------------------------------------------------------------------------

@router.get("/{activity_id}", response_model=ScheduleActivityPublic)
async def get_activity(
    activity_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    col = get_activities_collection()
    try:
        doc = await col.find_one({"_id": ObjectId(activity_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid activity ID.")
    if not doc:
        raise HTTPException(status_code=404, detail="Activity not found.")
    require_project_access(current_user, doc["project_id"])
    return _doc_to_public(doc)


# ---------------------------------------------------------------------------
# POST /api/schedule/
# ---------------------------------------------------------------------------

@router.post("/", response_model=ScheduleActivityPublic, status_code=status.HTTP_201_CREATED)
async def create_activity(
    body: ActivityCreate,
    current_user: UserInDB = Depends(require_pm),
):
    col = get_activities_collection()
    require_project_access(current_user, body.project_id)

    location = None
    if body.location_lat is not None and body.location_lng is not None:
        location = {"type": "Point", "coordinates": [body.location_lng, body.location_lat]}

    duration_days = max(1, (body.planned_end.date() - body.planned_start.date()).days)

    doc = {
        "_id": ObjectId(),
        "project_id": body.project_id,
        "activity_code": body.activity_code,
        "activity_name": body.activity_name,
        "location": location,
        "planned_start": body.planned_start,
        "planned_end": body.planned_end,
        "percent_complete": 0.0,
        "status": ActivityStatus.not_started,
        "keywords": body.keywords,
        "planned_quantity": body.planned_quantity,
        "quantity_unit": body.quantity_unit,
        "dependencies": body.dependencies,
        "milestone": body.milestone,
        "critical_path": body.critical_path,
        "baseline_start": body.planned_start,
        "baseline_end": body.planned_end,
        "baseline_duration_days": duration_days,
    }
    await col.insert_one(doc)
    act_id = str(doc["_id"])

    await write_audit_log(
        action="schedule_activity_created",
        actor_user_id=str(current_user.id),
        target_id=act_id,
        project_id=body.project_id,
        after_state={"activity_code": body.activity_code, "activity_name": body.activity_name},
    )

    # Time Machine: Record initial baseline snapshot and ACTIVITY_CREATED event
    try:
        await activity_event_service.record_schedule_baseline(
            project_id=body.project_id,
            activity_id=act_id,
            planned_start=body.planned_start,
            planned_end=body.planned_end,
            planned_quantity=body.planned_quantity,
            quantity_unit=body.quantity_unit,
            dependencies=body.dependencies,
            created_by=str(current_user.id),
            notes="Initial baseline set upon activity creation",
        )
        await activity_event_service.create_event(
            project_id=body.project_id,
            activity_id=act_id,
            event_type=EventType.ACTIVITY_CREATED,
            source_type="SCHEDULE",
            source_id=act_id,
            actor_id=str(current_user.id),
            description=f"Activity initialized: {body.activity_code} ({body.activity_name})",
            progress_after=0.0,
            metadata={"dependencies": body.dependencies, "milestone": body.milestone},
        )
    except Exception as ev_exc:
        print(f"[Schedule] Event recording error: {ev_exc}")

    return _doc_to_public(doc)


# ---------------------------------------------------------------------------
# PUT /api/schedule/{activity_id}
# ---------------------------------------------------------------------------

@router.put("/{activity_id}", response_model=ScheduleActivityPublic)
async def update_activity(
    activity_id: str,
    body: ActivityUpdate,
    current_user: UserInDB = Depends(require_pm),
):
    col = get_activities_collection()
    try:
        existing = await col.find_one({"_id": ObjectId(activity_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid activity ID.")
    if not existing:
        raise HTTPException(status_code=404, detail="Activity not found.")
    require_project_access(current_user, existing["project_id"])

    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        await col.update_one({"_id": ObjectId(activity_id)}, {"$set": updates})
        await write_audit_log(
            action="schedule_activity_updated",
            actor_user_id=str(current_user.id),
            target_id=activity_id,
            project_id=existing["project_id"],
            before_state={key: existing.get(key) for key in updates},
            after_state=updates,
        )

        # Time Machine: Snapshot new baseline if schedule dates/scope changed
        schedule_date_changed = "planned_start" in updates or "planned_end" in updates or "planned_quantity" in updates
        if schedule_date_changed:
            try:
                new_start = updates.get("planned_start") or existing.get("planned_start")
                new_end = updates.get("planned_end") or existing.get("planned_end")
                if new_start and new_end:
                    await activity_event_service.record_schedule_baseline(
                        project_id=existing["project_id"],
                        activity_id=activity_id,
                        planned_start=new_start,
                        planned_end=new_end,
                        planned_quantity=updates.get("planned_quantity") or existing.get("planned_quantity"),
                        quantity_unit=updates.get("quantity_unit") or existing.get("quantity_unit"),
                        dependencies=updates.get("dependencies") or existing.get("dependencies", []),
                        created_by=str(current_user.id),
                        notes="Baseline snapshot updated following schedule revision",
                    )
                await activity_event_service.create_event(
                    project_id=existing["project_id"],
                    activity_id=activity_id,
                    event_type=EventType.SCHEDULE_UPDATED,
                    source_type="PM_SCHEDULE_EDIT",
                    source_id=activity_id,
                    actor_id=str(current_user.id),
                    description=f"Schedule revised by PM: {list(updates.keys())}",
                    metadata={"updates": {k: str(v) for k, v in updates.items()}},
                )
            except Exception as ev_exc:
                print(f"[Schedule] Error recording revision baseline: {ev_exc}")

    updated = await col.find_one({"_id": ObjectId(activity_id)})
    return _doc_to_public(updated)
