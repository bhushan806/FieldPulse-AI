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

from app.core.deps import require_pm, require_project_access
from app.db.mongo import get_activities_collection, get_captures_collection, get_users_collection
from app.models.activity_event import EventType
from app.models.capture import CapturePublic, CaptureStatus
from app.models.user import UserInDB, UserRole
from app.services.activity_event_service import activity_event_service
from app.websocket.manager import ws_manager
from app.services.audit import write_audit_log

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

    query = {"status": CaptureStatus.pending_review.value}
    if project_id:
        require_project_access(current_user, project_id)
        query["project_id"] = project_id
    elif current_user.role not in (UserRole.platform_admin, UserRole.hq_admin, UserRole.auditor):
        query["project_id"] = {"$in": current_user.project_ids}


    total = await cap_col.count_documents(query)
    cursor = cap_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    # Batch fetch users and suggested activities to eliminate N+1 latency
    user_oids = [
        ObjectId(d["user_id"])
        for d in docs
        if d.get("user_id") and ObjectId.is_valid(d["user_id"])
    ]
    act_oids = [
        ObjectId(d["matched_activity_id"])
        for d in docs
        if d.get("matched_activity_id") and ObjectId.is_valid(d["matched_activity_id"])
    ]

    users_map = {}
    if user_oids:
        user_cursor = user_col.find({"_id": {"$in": user_oids}}, {"name": 1})
        user_list = await user_cursor.to_list(length=len(user_oids))
        users_map = {str(u["_id"]): u.get("name", "Unknown") for u in user_list}

    acts_map = {}
    if act_oids:
        act_cursor = act_col.find(
            {"_id": {"$in": act_oids}},
            {"activity_code": 1, "activity_name": 1}
        )
        act_list = await act_cursor.to_list(length=len(act_oids))
        acts_map = {
            str(a["_id"]): SuggestedActivity(
                id=str(a["_id"]),
                activity_code=a.get("activity_code", ""),
                activity_name=a.get("activity_name", ""),
            )
            for a in act_list
        }

    items: List[ReviewQueueItem] = []
    for d in docs:
        d["id"] = str(d.pop("_id"))

        # Map user
        submitted_by = None
        uid = str(d.get("user_id", ""))
        if uid in users_map:
            submitted_by = SubmittedBy(id=uid, name=users_map[uid])

        # Map activity
        aid = str(d.get("matched_activity_id", ""))
        suggested_activity = acts_map.get(aid)

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
    require_project_access(current_user, cap_doc["project_id"])

    if cap_doc["status"] not in (CaptureStatus.pending_review, CaptureStatus.processing):
        raise HTTPException(status_code=400, detail="Capture is not pending review.")

    # Verify the activity exists
    try:
        act_doc = await act_col.find_one({"_id": ObjectId(body.matched_activity_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid activity ID.")
    if not act_doc:
        raise HTTPException(status_code=404, detail="Activity not found.")
    if act_doc.get("project_id") != cap_doc["project_id"]:
        raise HTTPException(status_code=422, detail="Activity must belong to the capture project.")

    # Update capture
    await cap_col.update_one(
        {"_id": ObjectId(capture_id)},
        {"$set": {
            "status": CaptureStatus.approved,
            "matched_activity_id": body.matched_activity_id,
        }},
    )

    # Update activity percent_complete
    current_pct = float(act_doc.get("percent_complete") or 0)
    new_pct = body.percent_complete_override
    if new_pct is None:
        new_pct = min(100.0, round(current_pct + 15.0, 1))
    await act_col.update_one(
        {"_id": ObjectId(body.matched_activity_id)},
        {"$set": {
            "percent_complete": new_pct,
            "status": "completed" if new_pct >= 100 else "in_progress",
        }},
    )
    await write_audit_log(
        action="capture_approved",
        actor_user_id=str(current_user.id),
        target_id=capture_id,
        project_id=cap_doc["project_id"],
        before_state={"status": cap_doc["status"]},
        after_state={"status": CaptureStatus.approved.value, "matched_activity_id": body.matched_activity_id},
    )
    await write_audit_log(
        action="activity_progress_manually_updated",
        actor_user_id=str(current_user.id),
        target_id=body.matched_activity_id,
        project_id=cap_doc["project_id"],
        before_state={"percent_complete": current_pct},
        after_state={"percent_complete": new_pct, "capture_id": capture_id},
    )

    # Time Machine: Record PM approval and progress events
    try:
        await activity_event_service.create_event(
            project_id=cap_doc["project_id"],
            activity_id=body.matched_activity_id,
            event_type=EventType.PM_APPROVED,
            source_type="PM_REVIEW",
            source_id=capture_id,
            actor_id=str(current_user.id),
            description=f"Capture approved by Project Manager {current_user.name}",
            evidence_ids=[capture_id],
            metadata={"percent_override": body.percent_complete_override},
        )
        await activity_event_service.create_event(
            project_id=cap_doc["project_id"],
            activity_id=body.matched_activity_id,
            event_type=EventType.PROGRESS_UPDATE,
            source_type="PM_REVIEW",
            source_id=capture_id,
            actor_id=str(current_user.id),
            description=f"Progress updated by PM review: {current_pct}% -> {new_pct}%",
            progress_before=current_pct,
            progress_after=new_pct,
            confidence=1.0,
            evidence_ids=[capture_id],
        )
    except Exception as ev_exc:
        print(f"[ReviewQueue] Error recording approval events: {ev_exc}")

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
    require_project_access(current_user, cap_doc["project_id"])

    await cap_col.update_one(
        {"_id": ObjectId(capture_id)},
        {"$set": {
            "status": CaptureStatus.rejected,
            "rejection_reason": body.reason,
        }},
    )
    await write_audit_log(
        action="capture_rejected",
        actor_user_id=str(current_user.id),
        target_id=capture_id,
        project_id=cap_doc["project_id"],
        before_state={"status": cap_doc["status"]},
        after_state={"status": CaptureStatus.rejected.value, "reason": body.reason},
    )

    # Time Machine: Record PM rejection event
    matched_id = cap_doc.get("matched_activity_id")
    if matched_id:
        try:
            await activity_event_service.create_event(
                project_id=cap_doc["project_id"],
                activity_id=matched_id,
                event_type=EventType.PM_REJECTED,
                source_type="PM_REVIEW",
                source_id=capture_id,
                actor_id=str(current_user.id),
                description=f"Capture rejected by PM. Reason: {body.reason}",
                evidence_ids=[capture_id],
                metadata={"rejection_reason": body.reason},
            )
        except Exception as ev_exc:
            print(f"[ReviewQueue] Error recording rejection event: {ev_exc}")

    return {"message": "Capture rejected.", "capture_id": capture_id}
