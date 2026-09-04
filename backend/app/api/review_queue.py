"""
backend/app/api/review_queue.py
PM review queue endpoints.

GET    /api/review-queue/                    — list pending captures
POST   /api/review-queue/{id}/approve        — approve and link to activity
POST   /api/review-queue/{id}/reject         — reject with reason
"""
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.deps import require_pm
from app.db.mongo import get_activities_collection, get_captures_collection, get_users_collection
from app.models.capture import CapturePublic, CaptureStatus
from app.models.user import UserInDB
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/review-queue", tags=["review-queue"])


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class SubmittedBy(BaseModel):
    id: str
    name: str


class SuggestedActivity(BaseModel):
    id: str
    activity_code: str
    activity_name: str


class ReviewQueueItem(CapturePublic):
    submitted_by: Optional[SubmittedBy] = None
    suggested_activity: Optional[SuggestedActivity] = None


class ReviewQueueListResponse(BaseModel):
    items: List[ReviewQueueItem]
    total: int


class ApproveBody(BaseModel):
    matched_activity_id: str
    percent_complete_override: Optional[float] = None


class RejectBody(BaseModel):
    reason: str


# ---------------------------------------------------------------------------
# GET /api/review-queue/
# ---------------------------------------------------------------------------

@router.get("/", response_model=ReviewQueueListResponse)
async def list_pending(
    project_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: UserInDB = Depends(require_pm),
):
    """List captures with status=pending_review (PM sees their project's queue)."""
    cap_col = get_captures_collection()
    user_col = get_users_collection()
    act_col = get_activities_collection()

    query: dict = {"status": CaptureStatus.pending_review}
    if project_id:
        query["project_id"] = project_id

    total = await cap_col.count_documents(query)
    cursor = cap_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    items: List[ReviewQueueItem] = []
    for d in docs:
        d["id"] = str(d.pop("_id"))

        # Join: submitted_by
        submitted_by = None
        try:
            user_doc = await user_col.find_one({"_id": ObjectId(d["user_id"])})
            if user_doc:
                submitted_by = SubmittedBy(id=str(user_doc["_id"]), name=user_doc["name"])
        except Exception:
            pass

        # Join: suggested_activity (AI-matched)
        suggested_activity = None
        if d.get("matched_activity_id"):
            try:
                act_doc = await act_col.find_one({"_id": ObjectId(d["matched_activity_id"])})
                if act_doc:
                    suggested_activity = SuggestedActivity(
                        id=str(act_doc["_id"]),
                        activity_code=act_doc["activity_code"],
                        activity_name=act_doc["activity_name"],
                    )
            except Exception:
                pass

        capture_pub = CapturePublic(**d)
        items.append(ReviewQueueItem(
            **capture_pub.dict(),
            submitted_by=submitted_by,
            suggested_activity=suggested_activity,
        ))

    return ReviewQueueListResponse(items=items, total=total)


# ---------------------------------------------------------------------------
# POST /api/review-queue/{capture_id}/approve
# ---------------------------------------------------------------------------

@router.post("/{capture_id}/approve")
async def approve_capture(
    capture_id: str,
    body: ApproveBody,
    current_user: UserInDB = Depends(require_pm),
):
    cap_col = get_captures_collection()
    act_col = get_activities_collection()

    try:
        cap_doc = await cap_col.find_one({"_id": ObjectId(capture_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid capture ID.")

    if not cap_doc:
        raise HTTPException(status_code=404, detail="Capture not found.")

    if cap_doc["status"] not in (CaptureStatus.pending_review, CaptureStatus.processing):
        raise HTTPException(status_code=400, detail="Capture is not pending review.")

    # Verify the activity exists
    try:
        act_doc = await act_col.find_one({"_id": ObjectId(body.matched_activity_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid activity ID.")
    if not act_doc:
        raise HTTPException(status_code=404, detail="Activity not found.")

    # Update capture
    await cap_col.update_one(
        {"_id": ObjectId(capture_id)},
        {"$set": {
            "status": CaptureStatus.approved,
            "matched_activity_id": body.matched_activity_id,
        }},
    )

    # Update activity percent_complete
    new_pct = body.percent_complete_override
    if new_pct is not None:
        await act_col.update_one(
            {"_id": ObjectId(body.matched_activity_id)},
            {"$set": {
                "percent_complete": new_pct,
                "status": "completed" if new_pct >= 100 else "in_progress",
            }},
        )
        # Broadcast
        await ws_manager.broadcast_to_project(
            project_id=cap_doc["project_id"],
            event="activity_updated",
            data={
                "activity_id": body.matched_activity_id,
                "project_id": cap_doc["project_id"],
                "percent_complete": new_pct,
            },
        )

    return {"message": "Capture approved.", "capture_id": capture_id}


# ---------------------------------------------------------------------------
# POST /api/review-queue/{capture_id}/reject
# ---------------------------------------------------------------------------

@router.post("/{capture_id}/reject")
async def reject_capture(
    capture_id: str,
    body: RejectBody,
    current_user: UserInDB = Depends(require_pm),
):
    cap_col = get_captures_collection()

    try:
        cap_doc = await cap_col.find_one({"_id": ObjectId(capture_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid capture ID.")
    if not cap_doc:
        raise HTTPException(status_code=404, detail="Capture not found.")

    await cap_col.update_one(
        {"_id": ObjectId(capture_id)},
        {"$set": {
            "status": CaptureStatus.rejected,
            "rejection_reason": body.reason,
        }},
    )

    return {"message": "Capture rejected.", "capture_id": capture_id}
