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

from app.core.deps import get_current_user, require_pm
from app.db.mongo import get_activities_collection
from app.models.activity import ActivityStatus, ScheduleActivityInDB, ScheduleActivityPublic
from app.models._helpers import GeoPoint
from app.models.user import UserInDB, UserRole

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


class ActivityUpdate(BaseModel):
    activity_name: Optional[str] = None
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    percent_complete: Optional[float] = None
    status: Optional[ActivityStatus] = None
    keywords: Optional[List[str]] = None


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
    col = get_activities_collection()
    cursor = col.find({"project_id": project_id}).sort("planned_start", 1)
    docs = await cursor.to_list(length=None)
    items = [_doc_to_public(d) for d in docs]
    return ScheduleListResponse(items=items)


# ---------------------------------------------------------------------------
# POST /api/schedule/
# ---------------------------------------------------------------------------

@router.post("/", response_model=ScheduleActivityPublic, status_code=status.HTTP_201_CREATED)
async def create_activity(
    body: ActivityCreate,
    current_user: UserInDB = Depends(require_pm),
):
    col = get_activities_collection()

    location = None
    if body.location_lat is not None and body.location_lng is not None:
        location = {"type": "Point", "coordinates": [body.location_lng, body.location_lat]}

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
    }
    await col.insert_one(doc)
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

    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        await col.update_one({"_id": ObjectId(activity_id)}, {"$set": updates})

    updated = await col.find_one({"_id": ObjectId(activity_id)})
    return _doc_to_public(updated)
