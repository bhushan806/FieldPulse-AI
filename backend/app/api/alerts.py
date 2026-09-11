"""
backend/app/api/alerts.py
Alert / notification endpoints.

GET  /api/alerts/                  — list notifications for a project
POST /api/alerts/{id}/read         — mark as read by current user
"""
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.deps import get_current_user, require_project_access
from app.db.mongo import get_notifications_collection
from app.models.notification import NotificationPublic
from app.models.user import UserInDB
from app.models.user import UserRole

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertListResponse(BaseModel):
    items: List[NotificationPublic]
    total: int


@router.get("/", response_model=AlertListResponse)
async def list_alerts(
    project_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: UserInDB = Depends(get_current_user),
):
    # Auto-sync delay alerts for project(s)
    try:
        from app.ai_engine.forecasting import sync_project_delay_alerts
        if project_id:
            await sync_project_delay_alerts(project_id)
        elif current_user.role in (UserRole.hq_admin, UserRole.auditor, UserRole.platform_admin):
            from app.db.mongo import get_projects_collection
            p_cursor = get_projects_collection().find({}, {"_id": 1})
            p_list = await p_cursor.to_list(length=20)
            for p in p_list:
                await sync_project_delay_alerts(str(p["_id"]))
        elif current_user.project_ids:
            for pid in current_user.project_ids:
                if ObjectId.is_valid(pid):
                    await sync_project_delay_alerts(pid)
    except Exception as exc:
        print(f"[Alerts] Sync error: {exc}")

    col = get_notifications_collection()
    query: dict = {}
    if project_id:
        require_project_access(current_user, project_id)
        query["project_id"] = project_id
    elif current_user.role not in (UserRole.hq_admin, UserRole.auditor, UserRole.platform_admin):
        query["project_id"] = {"$in": current_user.project_ids}

    total = await col.count_documents(query)
    cursor = col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    # Resolve project names for friendly display
    project_ids = list({str(d.get("project_id")) for d in docs if d.get("project_id")})
    p_map = {}
    if project_ids:
        from app.db.mongo import get_projects_collection
        p_col = get_projects_collection()
        p_oids = [ObjectId(pid) for pid in project_ids if ObjectId.is_valid(pid)]
        if p_oids:
            p_cursor = p_col.find({"_id": {"$in": p_oids}}, {"name": 1})
            p_docs = await p_cursor.to_list(length=len(p_oids))
            for p in p_docs:
                p_map[str(p["_id"])] = p.get("name", "Project")

    items = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        pid = str(d.get("project_id", ""))
        d["project_name"] = p_map.get(pid, f"Project {pid[:6]}" if pid else "Global")
        if "read_by" not in d:
            d["read_by"] = []
        if "activity_id" not in d:
            d["activity_id"] = None
        try:
            items.append(NotificationPublic(**d))
        except Exception:
            # If type not recognized or validation issue, fallback to delay
            d["type"] = AlertType.delay
            items.append(NotificationPublic(**d))

    return AlertListResponse(items=items, total=total)



@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    col = get_notifications_collection()
    try:
        notification = await col.find_one({"_id": ObjectId(notification_id)})
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found.")
        require_project_access(current_user, notification["project_id"])
        result = await col.update_one(
            {"_id": ObjectId(notification_id)},
            {"$addToSet": {"read_by": str(current_user.id)}},
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID.")

    return {"message": "Marked as read."}
