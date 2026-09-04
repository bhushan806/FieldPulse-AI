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

from app.core.deps import get_current_user
from app.db.mongo import get_notifications_collection
from app.models.notification import NotificationPublic
from app.models.user import UserInDB

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
    col = get_notifications_collection()
    query: dict = {}
    if project_id:
        query["project_id"] = project_id

    total = await col.count_documents(query)
    cursor = col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    items = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        items.append(NotificationPublic(**d))

    return AlertListResponse(items=items, total=total)


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    col = get_notifications_collection()
    try:
        result = await col.update_one(
            {"_id": ObjectId(notification_id)},
            {"$addToSet": {"read_by": str(current_user.id)}},
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID.")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found.")

    return {"message": "Marked as read."}
